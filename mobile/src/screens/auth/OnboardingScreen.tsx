import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation?: any;
  onComplete?: () => void;
}

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'wallet',
    title: 'Controle suas Finanças',
    description: 'Gerencie todas as suas contas bancárias, carteiras e investimentos em um só lugar.',
    color: '#2563EB',
  },
  {
    id: '2',
    icon: 'trending-up',
    title: 'Acompanhe seus Gastos',
    description: 'Visualize para onde vai seu dinheiro com relatórios detalhados e gráficos intuitivos.',
    color: '#10B981',
  },
  {
    id: '3',
    icon: 'flag',
    title: 'Alcance suas Metas',
    description: 'Defina objetivos de poupança e acompanhe seu progresso para realizar seus sonhos.',
    color: '#F59E0B',
  },
  {
    id: '4',
    icon: 'people',
    title: 'Gerencie em Equipe',
    description: 'Convide familiares ou sócios para gerenciar as finanças juntos de forma organizada.',
    color: '#8B5CF6',
  },
];

const ONBOARDING_KEY = '@financecontrol_onboarding_complete';

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, onComplete }) => {
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      if (onComplete) {
        onComplete();
      } else {
        navigation?.replace('Login');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width }]}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${item.color}15`,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <View style={[styles.iconInner, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon} size={64} color="#FFFFFF" />
          </View>
        </Animated.View>
        
        <Animated.Text
          style={[
            styles.title,
            { color: colors.text, opacity },
          ]}
        >
          {item.title}
        </Animated.Text>
        
        <Animated.Text
          style={[
            styles.description,
            { color: colors.textSecondary, opacity },
          ]}
        >
          {item.description}
        </Animated.Text>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: slides[currentIndex].color,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.skipButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={handleSkip}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Pular</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
      />

      {/* Pagination */}
      {renderPagination()}

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <Button
          title={currentIndex === slides.length - 1 ? 'Começar' : 'Próximo'}
          onPress={handleNext}
          fullWidth
          size="lg"
          icon={currentIndex === slides.length - 1 ? 'rocket-outline' : 'arrow-forward'}
          iconPosition="right"
          style={{ backgroundColor: slides[currentIndex].color }}
        />
        
        {currentIndex === slides.length - 1 && (
          <View style={styles.loginPrompt}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Já tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                Entrar
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
