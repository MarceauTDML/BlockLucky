import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'blocklucky_jwt_token';
const USER_KEY = 'blocklucky_user_profile';

const memoryCache: Record<string, string> = {};

export const secureStorage = {
  async setToken(token: string): Promise<void> {
    memoryCache[TOKEN_KEY] = token;
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore?.setItemAsync === 'function') {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
      } catch {}
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  },

  async getToken(): Promise<string | null> {
    if (memoryCache[TOKEN_KEY]) {
      return memoryCache[TOKEN_KEY];
    }
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore?.getItemAsync === 'function') {
          const stored = await SecureStore.getItemAsync(TOKEN_KEY);
          if (stored) memoryCache[TOKEN_KEY] = stored;
          return stored;
        }
        return null;
      } catch {
        return null;
      }
    } else if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  async clearToken(): Promise<void> {
    delete memoryCache[TOKEN_KEY];
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore?.deleteItemAsync === 'function') {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      } catch {}
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  },

  async setUserJson(userJson: string): Promise<void> {
    memoryCache[USER_KEY] = userJson;
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore?.setItemAsync === 'function') {
          await SecureStore.setItemAsync(USER_KEY, userJson);
        }
      } catch {}
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(USER_KEY, userJson);
    }
  },

  async getUserJson(): Promise<string | null> {
    if (memoryCache[USER_KEY]) {
      return memoryCache[USER_KEY];
    }
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore?.getItemAsync === 'function') {
          return await SecureStore.getItemAsync(USER_KEY);
        }
        return null;
      } catch {
        return null;
      }
    } else if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(USER_KEY);
    }
    return null;
  },
};

export default secureStorage;
