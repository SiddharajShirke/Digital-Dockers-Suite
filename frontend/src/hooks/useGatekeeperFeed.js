import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useTechDebtSocket } from './useTechDebtSocket';

/**
 * useGatekeeperFeed - Fetch and manage Gatekeeper feed with real-time updates
 * 
 * Features:
 * - Pagination with infinite scroll support
 * - Real-time PR status updates via Socket.io
 * - Filter by status, search, and repoId
 * - Automatic refetch capability
 */
export const useGatekeeperFeed = (options = {}) => {
  const {
    initialLoading = true,
    filters = {},
    enableRealtime = true
  } = options;

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    passCount: 0,
    blockCount: 0,
    passRate: 0
  });

  const lastFetchRef = useRef(null);

  // Socket integration for real-time updates
  const { isConnected, lastEvent } = useTechDebtSocket({
    autoConnect: enableRealtime,
    onPRUpdate: useCallback((data) => {
      // Optimistically update the feed with new PR status
      setFeed(prevFeed => {
        const existingIndex = prevFeed.findIndex(
          pr => pr._id === data._id || pr.prNumber === data.prNumber
        );

        if (existingIndex >= 0) {
          // Update existing PR
          const updated = [...prevFeed];
          updated[existingIndex] = { ...updated[existingIndex], ...data };
          return updated;
        } else {
          // New PR - add to top of feed
          return [data, ...prevFeed];
        }
      });
    }, [])
  });

  const fetchGatekeeperFeed = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pageNum,
        limit: 15,
        status: filters.status,
        search: filters.search,
        repoId: filters.repoId
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await api.get('/tech-debt/gatekeeper-feed', { params });

      const newItems = response.data.prs || response.data || [];
      const total = response.data.total || newItems.length;

      setFeed(prev => isLoadMore ? [...prev, ...newItems] : newItems);
      setHasMore(isLoadMore
        ? feed.length + newItems.length < total
        : newItems.length >= 15
      );

      // Calculate stats
      const allItems = isLoadMore ? [...feed, ...newItems] : newItems;
      const passCount = allItems.filter(pr => pr.status === 'PASS').length;
      const blockCount = allItems.filter(pr => pr.status === 'BLOCK').length;

      setStats({
        total,
        passCount,
        blockCount,
        passRate: allItems.length > 0 ? Math.round((passCount / allItems.length) * 100) : 0
      });

      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error('Failed to fetch gatekeeper feed:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.search, filters.repoId, feed.length]);

  // Initial fetch
  useEffect(() => {
    setPage(1);
    fetchGatekeeperFeed(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.search, filters.repoId]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGatekeeperFeed(nextPage, true);
    }
  }, [loading, hasMore, page, fetchGatekeeperFeed]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setPage(1);
    fetchGatekeeperFeed(1, false);
  }, [fetchGatekeeperFeed]);

  return {
    feed,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    stats,
    isConnected,
    lastUpdate: lastEvent?.timestamp || lastFetchRef.current
  };
};

export default useGatekeeperFeed;
