import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  discountAmount: number;
  isDrawerOpen: boolean;
  
  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  
  setDrawerOpen: (isOpen: boolean) => void;
  
  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discountAmount: 0,
      isDrawerOpen: false,

      addItem: (item) => set((state) => {
        const existingItem = state.items.find(i => i.productId === item.productId && i.size === item.size);
        if (existingItem) {
          return {
            items: state.items.map(i => 
              i.productId === item.productId && i.size === item.size
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
            isDrawerOpen: true
          };
        }
        return { items: [...state.items, item], isDrawerOpen: true };
      }),

      removeItem: (productId, size) => set((state) => ({
        items: state.items.filter(i => !(i.productId === productId && i.size === size))
      })),

      updateQuantity: (productId, size, quantity) => set((state) => ({
        items: state.items.map(i => 
          i.productId === productId && i.size === size
            ? { ...i, quantity: Math.max(1, quantity) }
            : i
        )
      })),

      clearCart: () => set({ items: [], couponCode: null, discountAmount: 0 }),

      applyCoupon: (code, discount) => set({ couponCode: code, discountAmount: discount }),
      removeCoupon: () => set({ couponCode: null, discountAmount: 0 }),
      
      setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getTotal: () => {
        const { getSubtotal, discountAmount } = get();
        return Math.max(0, getSubtotal() - discountAmount);
      }
    }),
    {
      name: 'solevault-cart',
    }
  )
);
