import { adminDb } from '../config/firebase';
import { Product } from '../types';
import { Query } from 'firebase-admin/firestore';

interface SearchOptions {
  category?: string;
  isActive?: boolean | string;
  isFeatured?: boolean | string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export const getProducts = async (filters: SearchOptions = {}) => {
  let query: Query = adminDb.collection('products');
  
  if (filters.isActive !== undefined) {
    query = query.where('isActive', '==', filters.isActive === 'true' || filters.isActive === true);
  }
  if (filters.category) {
    query = query.where('category', '==', filters.category);
  }
  if (filters.isFeatured !== undefined) {
    query = query.where('isFeatured', '==', filters.isFeatured === 'true' || filters.isFeatured === true);
  }

  const snapshot = await query.get();
  let products = snapshot.docs.map(doc => doc.data() as Product);

  // In-memory search (since Firestore doesn't support native full-text search)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.description.toLowerCase().includes(searchLower)
    );
  }

  // In-memory sorting
  if (filters.sort) {
    switch (filters.sort) {
      case 'price-asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'name-asc':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        products.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
  }

  const total = products.length;
  
  // Pagination
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  products = products.slice(startIndex, endIndex);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};
export const getProductBySlug = async (slug: string) => {
  const snapshot = await adminDb.collection('products').where('slug', '==', slug).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Product;
};

export const createProduct = async (productData: Partial<Product>) => {
  const docRef = adminDb.collection('products').doc();
  const newProduct: Product = {
    ...productData,
    id: docRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    ratings: { average: 0, count: 0 }
  } as Product;
  
  await docRef.set(newProduct);
  return newProduct;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const docRef = adminDb.collection('products').doc(id);
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await docRef.update(updateData);
  const updatedDoc = await docRef.get();
  return updatedDoc.data() as Product;
};

export const deleteProduct = async (id: string) => {
  await adminDb.collection('products').doc(id).delete();
  return true;
};
