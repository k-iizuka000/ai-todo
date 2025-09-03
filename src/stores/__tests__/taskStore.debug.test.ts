/**
 * TaskStore Debug Test
 * ストアの実際の状態を確認するためのデバッグテスト
 */

import { renderHook } from '@testing-library/react';
import { useTaskStore } from '../taskStore';

describe('TaskStore Debug Test', () => {
  it('ストアの構造を確認する', () => {
    const { result } = renderHook(() => useTaskStore());
    
    console.log('Store result.current:', result.current);
    console.log('Type of result.current:', typeof result.current);
    console.log('Keys:', Object.keys(result.current || {}));
    console.log('getState:', result.current?.getState);
    console.log('getState():', result.current?.getState ? result.current.getState() : 'undefined');
    
    const state = result.current?.getState ? result.current.getState() : null;
    if (state) {
      console.log('State keys:', Object.keys(state));
      console.log('addTask:', state.addTask);
      console.log('lastUpdated:', state.lastUpdated);
    }
    
    expect(result.current).toBeDefined();
  });
});