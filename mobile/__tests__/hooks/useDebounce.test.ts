import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../../src/hooks/useDebounce';

// Mock do setTimeout
jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    expect(result.current).toBe('initial');

    // Muda o valor
    rerender({ value: 'updated', delay: 500 });
    
    // Valor ainda deve ser o inicial
    expect(result.current).toBe('initial');

    // Avança o tempo
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Agora deve ter o valor atualizado
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: 'initial' }
      }
    );

    // Primeira mudança
    rerender({ value: 'first' });
    
    // Avança parcialmente
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Segunda mudança antes do debounce completar
    rerender({ value: 'second' });
    
    // Avança mais 300ms (total 600ms, mas timer foi resetado)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Ainda deve ser o valor inicial
    expect(result.current).toBe('initial');
    
    // Avança mais 200ms para completar os 500ms do último timer
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    // Agora deve ter o último valor
    expect(result.current).toBe('second');
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 }
      }
    );

    rerender({ value: 'updated', delay: 1000 });

    // Avança 500ms (menos que o delay)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe('initial');

    // Avança mais 500ms (total 1000ms)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe('updated');
  });
});