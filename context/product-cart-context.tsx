"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PRODUCT_CART_STORAGE_KEY,
  addItem,
  itemCount,
  readCart,
  removeItem,
  setQuantity,
  type CartItem,
} from "@/lib/products/cart";

interface ProductCartContextType {
  items: CartItem[];
  count: number;
  add: (productId: string, quantity?: number, maxStock?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, quantity: number, maxStock?: number) => void;
  clear: () => void;
}

const ProductCartContext = createContext<ProductCartContextType | undefined>(
  undefined,
);

export default function ProductCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate after mount so the first client render matches SSR (empty cart).
  useEffect(() => {
    setItems(readCart(localStorage.getItem(PRODUCT_CART_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PRODUCT_CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback(
    (productId: string, quantity = 1, maxStock?: number) =>
      setItems((prev) => addItem(prev, productId, quantity, maxStock)),
    [],
  );
  const remove = useCallback(
    (productId: string) => setItems((prev) => removeItem(prev, productId)),
    [],
  );
  const setQty = useCallback(
    (productId: string, quantity: number, maxStock?: number) =>
      setItems((prev) => setQuantity(prev, productId, quantity, maxStock)),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: itemCount(items), add, remove, setQty, clear }),
    [items, add, remove, setQty, clear],
  );

  return (
    <ProductCartContext.Provider value={value}>
      {children}
    </ProductCartContext.Provider>
  );
}

export function useProductCart() {
  const context = useContext(ProductCartContext);
  if (context === undefined) {
    throw new Error("useProductCart must be used within a ProductCartProvider");
  }
  return context;
}
