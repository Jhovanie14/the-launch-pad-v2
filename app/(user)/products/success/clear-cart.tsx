"use client";

import { useEffect } from "react";
import { useProductCart } from "@/context/product-cart-context";

export default function ClearCart() {
  const { clear } = useProductCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
