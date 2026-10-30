export interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  product_brand: string;
  product_image_url: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface CreateOrderPayload {
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
}
