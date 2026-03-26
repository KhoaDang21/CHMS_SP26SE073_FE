import React, { createContext, useContext, useEffect, useState } from 'react';
import { wishlistService } from '../services/wishlistService';
import { authService } from '../services/authService';

type WishlistContextValue = {
    favorites: Set<string>;
    loading: boolean;
    refresh: () => Promise<void>;
    toggle: (id: string) => Promise<void>;
    addLocal: (id: string) => void;
    removeLocal: (id: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const useWishlist = (): WishlistContextValue => {
    const ctx = useContext(WishlistContext);
    if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
    return ctx;
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const load = async () => {
        if (!authService.isAuthenticated()) {
            setFavorites(new Set());
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const list = await wishlistService.getMyWishlist();
            const ids = new Set(list.map(h => String(h.id)));
            setFavorites(ids);
        } catch (e) {
            setFavorites(new Set());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const refresh = async () => { await load(); };

    const addLocal = (id: string) => setFavorites(s => new Set(Array.from(s).concat([id])));
    const removeLocal = (id: string) => setFavorites(s => {
        const copy = new Set(s);
        copy.delete(id);
        return copy;
    });

    const toggle = async (id: string) => {
        const isFav = favorites.has(id);
        if (isFav) {
            removeLocal(id);
            // optimistic update: notify immediately
            window.dispatchEvent(new Event('wishlist-changed'));
            try {
                await wishlistService.remove(id);
            } catch (e) {
                addLocal(id); // rollback
                window.dispatchEvent(new Event('wishlist-changed'));
                throw e;
            }
        } else {
            addLocal(id);
            // optimistic update: notify immediately
            window.dispatchEvent(new Event('wishlist-changed'));
            try {
                await wishlistService.add(id);
            } catch (e) {
                removeLocal(id);
                window.dispatchEvent(new Event('wishlist-changed'));
                throw e;
            }
        }
    };

    return (
        <WishlistContext.Provider value={{ favorites, loading, refresh, toggle, addLocal, removeLocal }}>
            {children}
        </WishlistContext.Provider>
    );
};
