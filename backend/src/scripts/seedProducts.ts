import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables for the script
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { adminDb } from '../config/firebase';
import type { Product } from '../types';

const sampleProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    slug: 'aethel-one-crimson',
    name: 'Aethel One - Crimson',
    brand: 'SoleVault',
    description: 'The flagship model. Featuring aerospace-grade materials for unprecedented comfort and durability. This is a design that redefines modern luxury footwear.',
    price: 250,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'],
    sizes: [
      { size: '7', stock: 10 },
      { size: '8', stock: 5 },
      { size: '9', stock: 0 },
      { size: '10', stock: 2 },
      { size: '11', stock: 5 }
    ],
    category: 'Sneakers',
    collection: 'Aethel Series',
    tags: ['lifestyle', 'running', 'premium'],
    isFeatured: true,
    isNewArrival: true,
    isActive: true,
    badges: ['New', 'Bestseller'],
    ratings: { average: 4.8, count: 124 }
  },
  {
    slug: 'urban-strider',
    name: 'Urban Strider',
    brand: 'SoleVault',
    description: 'Designed for the concrete jungle. Exceptional grip and responsive cushioning for all-day urban exploration.',
    price: 180,
    images: ['https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=800&q=80'],
    sizes: [
      { size: '7', stock: 3 },
      { size: '8', stock: 8 },
      { size: '9', stock: 12 },
      { size: '10', stock: 10 }
    ],
    category: 'Sneakers',
    collection: 'Urban',
    tags: ['streetwear', 'daily'],
    isFeatured: false,
    isNewArrival: true,
    isActive: true,
    badges: ['Trending'],
    ratings: { average: 4.5, count: 86 }
  },
  {
    slug: 'classic-oxford-midnight',
    name: 'Classic Oxford Midnight',
    brand: 'SoleVault Heritage',
    description: 'Timeless elegance meets modern craftsmanship. Hand-stitched premium leather that ages beautifully.',
    price: 320,
    images: ['https://images.unsplash.com/photo-1614252339460-e143b44b92db?w=800&q=80'],
    sizes: [
      { size: '8', stock: 5 },
      { size: '9', stock: 4 },
      { size: '10', stock: 2 },
      { size: '11', stock: 1 }
    ],
    category: 'Oxfords',
    collection: 'Heritage',
    tags: ['formal', 'leather', 'classic'],
    isFeatured: true,
    isNewArrival: false,
    isActive: true,
    badges: ['Limited Edition'],
    ratings: { average: 5.0, count: 42 }
  },
  {
    slug: 'aethel-two-obsidian',
    name: 'Aethel Two - Obsidian',
    brand: 'SoleVault',
    description: 'The next evolution. Lighter, faster, and more breathable than ever before.',
    price: 280,
    images: ['https://images.unsplash.com/photo-1552346154-21d32810baa3?w=800&q=80'],
    sizes: [
      { size: '8', stock: 15 },
      { size: '9', stock: 20 },
      { size: '10', stock: 15 },
      { size: '12', stock: 5 }
    ],
    category: 'Sneakers',
    collection: 'Aethel Series',
    tags: ['performance', 'running'],
    isFeatured: true,
    isNewArrival: true,
    isActive: true,
    badges: ['New'],
    ratings: { average: 4.9, count: 28 }
  },
  {
    slug: 'nomad-boots-tan',
    name: 'Nomad Boots Tan',
    brand: 'SoleVault',
    description: 'Rugged durability for any terrain. Waterproof construction with a breathable membrane.',
    price: 210,
    images: ['https://images.unsplash.com/photo-1608256246200-53e635b5e135?w=800&q=80'],
    sizes: [
      { size: '9', stock: 8 },
      { size: '10', stock: 12 },
      { size: '11', stock: 6 }
    ],
    category: 'Boots',
    collection: 'Adventure',
    tags: ['outdoor', 'waterproof', 'rugged'],
    isFeatured: false,
    isNewArrival: false,
    isActive: true,
    badges: [],
    ratings: { average: 4.6, count: 215 }
  },
  {
    slug: 'pennylane-loafers',
    name: 'Pennylane Loafers',
    brand: 'SoleVault Heritage',
    description: 'Slip into luxury. Suede finish with a classic silhouette perfect for smart-casual occasions.',
    price: 195,
    images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80'],
    sizes: [
      { size: '7', stock: 4 },
      { size: '8', stock: 6 },
      { size: '9', stock: 5 },
      { size: '10', stock: 0 }
    ],
    category: 'Loafers',
    collection: 'Heritage',
    tags: ['casual', 'suede', 'slip-on'],
    isFeatured: false,
    isNewArrival: false,
    isActive: true,
    badges: [],
    ratings: { average: 4.4, count: 56 }
  }
];

async function seedDatabase() {
  console.log('Starting product database seed...');
  let addedCount = 0;

  try {
    const productsRef = adminDb.collection('products');
    
    for (const prodData of sampleProducts) {
      // Check if product with this slug already exists to prevent duplicates
      const existing = await productsRef.where('slug', '==', prodData.slug).get();
      
      if (existing.empty) {
        const docRef = productsRef.doc();
        const now = new Date().toISOString();
        
        const newProduct: Product = {
          ...prodData,
          id: docRef.id,
          createdAt: now,
          updatedAt: now
        };
        
        await docRef.set(newProduct);
        console.log(`✅ Added product: ${newProduct.name} (${newProduct.slug})`);
        addedCount++;
      } else {
        console.log(`⏭️ Skipped product (already exists): ${prodData.name} (${prodData.slug})`);
      }
    }
    
    console.log(`\\n🎉 Seed complete! Added ${addedCount} new products.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
