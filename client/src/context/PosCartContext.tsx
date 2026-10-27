import { createRequestId } from '../utils/id';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem, MenuItem, MenuItemVariant, Order } from '../types';
import { api } from '../services/api';
import { useBranch } from './BranchContext';

interface PosCartContextType {
  heldOrderId: string | null;
  cartItems: CartItem[];
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  discountType: 'PERCENT' | 'AMOUNT';
  discountValue: number;
  discountReason: string;
  notes: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  heldOrders: Order[];
  isLoadingHeld: boolean;
  addToCart: (item: MenuItem, variant?: MenuItemVariant | null, qty?: number, itemNotes?: string, sellingPrice?: number) => void;
  updateQuantity: (index: number, newQty: number) => void;
  removeItem: (index: number) => void;
  setItemNotes: (index: number, lineNote: string) => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') => void;
  setTableNumber: (table: string) => void;
  setCustomerInfo: (name: string, phone: string) => void;
  setDiscount: (type: 'PERCENT' | 'AMOUNT', val: number, reason: string) => void;
  clearCart: () => void;
  fetchHeldOrders: () => Promise<void>;
  holdCurrentCart: () => Promise<boolean>;
  resumeHeldOrder: (heldOrder: Order) => Promise<boolean>;
}

const PosCartContext = createContext<PosCartContextType | undefined>(undefined);

export const PosCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentBranchId } = useBranch();
  const [heldOrderId, setHeldOrderId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState<string>('T-01');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('AMOUNT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);
  const [isLoadingHeld, setIsLoadingHeld] = useState<boolean>(false);

  const fetchHeldOrders = async () => {
    try {
      setIsLoadingHeld(true);
      const data = await api.getHeldOrders({ branchId: currentBranchId || undefined });
      setHeldOrders(data);
    } catch (err) {
      console.error('Failed to fetch held orders:', err);
    } finally {
      setIsLoadingHeld(false);
    }
  };

  useEffect(() => {
    fetchHeldOrders();
  }, [currentBranchId]);

  const addToCart = (item: MenuItem, variant?: MenuItemVariant | null, qty = 1, itemNotes = '', sellingPrice?: number) => {
    setCartItems(prev => {
      const price = sellingPrice ?? (variant ? variant.price : item.basePrice);
      const cost = variant ? variant.costPrice : item.costPrice;

      // Check if identical item with same variant already in cart
      const existingIdx = prev.findIndex(
        ci => ci.menuItem.id === item.id && ci.unitPrice === price && (variant ? ci.variant?.id === variant.id : !ci.variant)
      );

      if (existingIdx > -1) {
        const updated = prev.map(item => ({ ...item }));
        updated[existingIdx].quantity += qty;
        if (itemNotes) {
          updated[existingIdx].notes = (updated[existingIdx].notes ? `${updated[existingIdx].notes}, ` : '') + itemNotes;
        }
        return updated;
      }

      return [
        ...prev,
        {
          menuItem: item,
          variant: variant || null,
          quantity: qty,
          unitPrice: price,
          unitCost: cost,
          notes: itemNotes,
        },
      ];
    });
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setCartItems(prev => {
      const updated = prev.map(item => ({ ...item }));
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const setItemNotes = (index: number, lineNote: string) => {
    setCartItems(prev => {
      const updated = prev.map(item => ({ ...item }));
      updated[index].notes = lineNote;
      return updated;
    });
  };

  const setCustomerInfo = (name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
  };

  const setDiscount = (type: 'PERCENT' | 'AMOUNT', val: number, reason: string) => {
    setDiscountType(type);
    setDiscountValue(Math.max(0, val));
    setDiscountReason(reason);
  };

  const clearCart = () => {
    setHeldOrderId(null);
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountValue(0);
    setDiscountReason('');
    setNotes('');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === 'PERCENT') {
      return Math.min(subtotal, Math.round(subtotal * discountValue) / 100);
    }
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const totalAmount = useMemo(() => {
    return Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  }, [subtotal, discountAmount]);

  const holdCurrentCart = async (): Promise<boolean> => {
    if (cartItems.length === 0) return false;

    const payload = {
      clientRequestId: createRequestId(),
      branchId: currentBranchId,
      orderType,
      tableNumber: orderType === 'DINE_IN' ? tableNumber : null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      items: cartItems.map(ci => ({
        menuItemId: ci.menuItem.id,
        variantId: ci.variant?.id || null,
        itemName: ci.menuItem.name,
        variantName: ci.variant?.name || null,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        unitCost: ci.unitCost,
        notes: ci.notes || null,
      })),
      discountAmount,
      discountReason,
      notes,
      isHeld: true,
    };

    try {
      if (heldOrderId) return false;
      await api.createOrder(payload);
      clearCart();
      await fetchHeldOrders();
      return true;
    } catch (err) {
      console.error('Failed to hold order:', err);
      return false;
    }
  };

  const resumeHeldOrder = async (heldOrder: Order): Promise<boolean> => {
    // If cart currently has items, alert/confirm first
    setCartItems(
      heldOrder.items.map(i => ({
        menuItem: {
          id: i.menuItemId,
          categoryId: '',
          name: i.itemName,
          basePrice: i.unitPrice,
          costPrice: i.unitCost || 0,
          isAvailable: true,
          hasVariants: !!i.variantId,
        },
        variant: i.variantId ? ({ id: i.variantId, menuItemId: i.menuItemId, name: i.variantName || '', price: i.unitPrice, costPrice: i.unitCost || 0, isAvailable: true }) : null,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost || 0,
        notes: i.notes || '',
      }))
    );

    setOrderType(heldOrder.orderType);
    setTableNumber(heldOrder.tableNumber || 'T-01');
    setCustomerName(heldOrder.customerName || '');
    setCustomerPhone(heldOrder.customerPhone || '');
    setHeldOrderId(heldOrder.id);
    setDiscountType('AMOUNT');
    setNotes(heldOrder.notes || '');
    setDiscountValue(heldOrder.discountAmount || 0);
    setDiscountReason(heldOrder.discountReason || '');

    return true;
  };

  return (
    <PosCartContext.Provider
      value={{
        heldOrderId,
        cartItems,
        orderType,
        tableNumber,
        customerName,
        customerPhone,
        discountType,
        discountValue,
        discountReason,
        notes,
        subtotal,
        discountAmount,
        totalAmount,
        heldOrders,
        isLoadingHeld,
        addToCart,
        updateQuantity,
        removeItem,
        setItemNotes,
        setOrderType,
        setTableNumber,
        setCustomerInfo,
        setDiscount,
        clearCart,
        fetchHeldOrders,
        holdCurrentCart,
        resumeHeldOrder,
      }}
    >
      {children}
    </PosCartContext.Provider>
  );
};

export const usePosCart = () => {
  const context = useContext(PosCartContext);
  if (!context) {
    throw new Error('usePosCart must be used within a PosCartProvider');
  }
  return context;
};
