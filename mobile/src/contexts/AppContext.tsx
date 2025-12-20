import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { storageService } from '../services/storage.service';
import { APP_CONFIG } from '../constants/config';
import { Theme, getTheme } from '../constants/themes';

// Estado da aplicação
interface AppState {
  theme: 'light' | 'dark' | 'system';
  isDarkMode: boolean;
  currentTheme: Theme;
  currency: string;
  language: 'pt' | 'en';
  isFirstLaunch: boolean;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  autoLockEnabled: boolean;
  debugMode: boolean;
}

// Ações do reducer
type AppAction =
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_SYSTEM_THEME'; payload: boolean }
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: 'pt' | 'en' }
  | { type: 'SET_FIRST_LAUNCH'; payload: boolean }
  | { type: 'SET_NOTIFICATIONS'; payload: boolean }
  | { type: 'SET_BIOMETRIC'; payload: boolean }
  | { type: 'SET_AUTO_LOCK'; payload: boolean }
  | { type: 'SET_DEBUG_MODE'; payload: boolean }
  | { type: 'LOAD_SETTINGS'; payload: Partial<AppState> };

// Estado inicial
const initialState: AppState = {
  theme: 'system',
  isDarkMode: Appearance.getColorScheme() === 'dark',
  currentTheme: getTheme(Appearance.getColorScheme() === 'dark'),
  currency: APP_CONFIG.DEFAULT_CURRENCY,
  language: 'pt',
  isFirstLaunch: true,
  notificationsEnabled: true,
  biometricEnabled: false,
  autoLockEnabled: false,
  debugMode: __DEV__,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_THEME':
      const isDark = action.payload === 'dark' || 
        (action.payload === 'system' && Appearance.getColorScheme() === 'dark');
      return {
        ...state,
        theme: action.payload,
        isDarkMode: isDark,
        currentTheme: getTheme(isDark),
      };
    
    case 'SET_SYSTEM_THEME':
      if (state.theme === 'system') {
        return {
          ...state,
          isDarkMode: action.payload,
          currentTheme: getTheme(action.payload),
        };
      }
      return state;
    
    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };
    
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    
    case 'SET_FIRST_LAUNCH':
      return { ...state, isFirstLaunch: action.payload };
    
    case 'SET_NOTIFICATIONS':
      return { ...state, notificationsEnabled: action.payload };
    
    case 'SET_BIOMETRIC':
      return { ...state, biometricEnabled: action.payload };
    
    case 'SET_AUTO_LOCK':
      return { ...state, autoLockEnabled: action.payload };
    
    case 'SET_DEBUG_MODE':
      return { ...state, debugMode: action.payload };
    
    case 'LOAD_SETTINGS':
      const isDarkFromSettings = action.payload.theme === 'dark' || 
        (action.payload.theme === 'system' && Appearance.getColorScheme() === 'dark');
      return {
        ...state,
        ...action.payload,
        isDarkMode: isDarkFromSettings,
        currentTheme: getTheme(isDarkFromSettings),
      };
    
    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Actions helpers
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  setCurrency: (currency: string) => void;
  setLanguage: (language: 'pt' | 'en') => void;
  setNotifications: (enabled: boolean) => void;
  setBiometric: (enabled: boolean) => void;
  setAutoLock: (enabled: boolean) => void;
  completeOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Carrega configurações salvas
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await storageService.getItem<Partial<AppState>>('app_settings');
        if (savedSettings) {
          dispatch({ type: 'LOAD_SETTINGS', payload: savedSettings });
        }
      } catch (error) {
        console.error('Error loading app settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Salva configurações quando o estado muda
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const settingsToSave = {
          theme: state.theme,
          currency: state.currency,
          language: state.language,
          isFirstLaunch: state.isFirstLaunch,
          notificationsEnabled: state.notificationsEnabled,
          biometricEnabled: state.biometricEnabled,
          autoLockEnabled: state.autoLockEnabled,
        };
        
        await storageService.setItem('app_settings', settingsToSave);
      } catch (error) {
        console.error('Error saving app settings:', error);
      }
    };

    saveSettings();
  }, [state]);

  // Listener para mudanças do tema do sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch({ type: 'SET_SYSTEM_THEME', payload: colorScheme === 'dark' });
    });

    return () => subscription?.remove();
  }, []);

  // Action helpers
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const toggleTheme = () => {
    const newTheme = state.isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const setCurrency = (currency: string) => {
    dispatch({ type: 'SET_CURRENCY', payload: currency });
  };

  const setLanguage = (language: 'pt' | 'en') => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  };

  const setNotifications = (enabled: boolean) => {
    dispatch({ type: 'SET_NOTIFICATIONS', payload: enabled });
  };

  const setBiometric = (enabled: boolean) => {
    dispatch({ type: 'SET_BIOMETRIC', payload: enabled });
  };

  const setAutoLock = (enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_LOCK', payload: enabled });
  };

  const completeOnboarding = () => {
    dispatch({ type: 'SET_FIRST_LAUNCH', payload: false });
  };

  const value: AppContextType = {
    state,
    dispatch,
    setTheme,
    toggleTheme,
    setCurrency,
    setLanguage,
    setNotifications,
    setBiometric,
    setAutoLock,
    completeOnboarding,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook para usar o contexto
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};