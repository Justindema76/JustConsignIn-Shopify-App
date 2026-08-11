import { useMemo, useState } from 'react';
import { ArrowLeft, Camera, Check, ChevronDown, Search, ShoppingBag } from 'lucide-react';
import { searchShopifyCategories } from '../../consignmentApi';

const cats = [
  'Clothing',
  'Shoes',
  'Jewellery',
  'Handbags',
  'Home Décor',
  'Furniture',
  'Electronics',
  'Books',
  'Collectibles',
  'Sporting Goods',
  'Toys',
  'Art',
  'Automotive',
  'Other',
];

const conditions = ['New with tags', 'Like new', 'Good', 'Fair'];

