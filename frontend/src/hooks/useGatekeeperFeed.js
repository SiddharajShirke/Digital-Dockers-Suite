import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useTechDebtSocket } from './useTechDebtSocket';

const EMPTY_STATS = {
  total: 0,
  passCount: 0,
  blockCount: 0,
  warnCount: 0,
  pendingCount: 0,
  passRate: 0,
  avgGatekeeperScore: 0,
  mergeReadyCount: 0,
  reviewQueueCount: 0,
  attentionCount: 0,
  readinessIndex: 0,
  scoreBuckets: {
    elite: 0,
    stable: 0,
    watch: 0,
    critical: 0
  }
};

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
    enableRealtime = true,
    autoAnalyzePending = false,
    autoAnalyzeLimit = 3
  } = options;

  const PAGE_SIZE = 15;

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({
    ...EMPTY_STATS
  });

  const lastFetchRef = useRef(null);
  const autoAnalyzeTriggeredRef = useRef(new Set());
  const inFlightAutoAnalyzeRef = useRef(new Set());

  const isPRItem = useCallback((item) => {
    return item?.type === 'pull_request' || Number.isFinite(Number(item?.prNumber));
  }, []);

  const getItemKey = useCallback((item) => {
    if (!item) return null;
    if (item.id) return item.id;
    if (item._id) return `mongo-${item._id}`;
    if (Number.isFinite(Number(item.prNumber))) return `pr-${item.prNumber}`;
    return null;
  }, []);

  const mergeFeedItems = useCallback((existingItems, incomingItems) => {
    const merged = [...existingItems];

    incomingItems.forEach((incoming) => {
      const incomingKey = getItemKey(incoming);
      const existingIndex = merged.findIndex((item) => {
        const existingKey = getItemKey(item);
        if (incomingKey && existingKey) {
          return incomingKey === existingKey;
        }
        return isPRItem(item) && isPRItem(incoming) && Number(item.prNumber) === Number(incoming.prNumber);
      });

      if (existingIndex >= 0) {
        merged[existingIndex] = { ...merged[existingIndex], ...incoming };
      } else {
        merged.push(incoming);
      }
    });

    merged.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
    return merged;
  }, [getItemKey, isPRItem]);

  const computeStats = useCallback((items, totalFromResponse = null) => {
    const prItems = items.filter(isPRItem);
    const passCount = prItems.filter((pr) => pr.status === 'PASS').length;
    const blockCount = prItems.filter((pr) => pr.status === 'BLOCK').length;
    const warnCount = prItems.filter((pr) => pr.status === 'WARN').length;
    const pendingCount = prItems.filter((pr) => pr.status === 'PENDING').length;

    const scoreBuckets = prItems.reduce((acc, pr) => {
      const score = Number(pr?.healthScore?.current ?? pr?.gatekeeperScore?.overall ?? (100 - Number(pr?.risk_score || 0)));
      if (score >= 85) acc.elite += 1;
      else if (score >= 70) acc.stable += 1;
      else if (score >= 55) acc.watch += 1;
      else acc.critical += 1;
      return acc;
    }, { elite: 0, stable: 0, watch: 0, critical: 0 });

    const readinessIndex =
      prItems.length > 0
        ? Math.max(0, Math.min(100, Math.round((((scoreBuckets.elite * 1) + (scoreBuckets.stable * 0.8) + (scoreBuckets.watch * 0.45)) / prItems.length) * 100)))
        : 0;

    return {
      total: Number.isFinite(Number(totalFromResponse)) ? Number(totalFromResponse) : prItems.length,
      passCount,
      blockCount,
      warnCount,
      pendingCount,
      passRate: prItems.length > 0 ? Math.round((passCount / prItems.length) * 100) : 0,
      avgGatekeeperScore:
        prItems.length > 0
          ? Math.round(
            prItems.reduce((sum, pr) => {
              const score = Number(pr?.healthScore?.current ?? pr?.gatekeeperScore?.overall ?? (100 - Number(pr?.risk_score || 0)));
              return sum + (Number.isFinite(score) ? score : 0);
            }, 0) / prItems.length
          )
          : 0,
      mergeReadyCount: passCount,
      reviewQueueCount: warnCount + pendingCount,
      attentionCount: blockCount + warnCount,
      readinessIndex,
      scoreBuckets
    };
  }, [isPRItem]);

  const doesItemMatchFilters = useCallback((item) => {
    if (!item) return false;
    if (filters.repoId && item.repoId && item.repoId !== filters.repoId) {
      return false;
    }

    if (filters.status && isPRItem(item) && item.status !== filters.status) {
      return false;
    }

    if (filters.search) {
      const term = String(filters.search).toLowerCase();
      const haystack = [
        item.title,
        item.description,
        item.path,
        item.repoId,
        item.author,
        item.prNumber
      ].filter(Boolean).join(' ').toLowerCase();

      if (!haystack.includes(term)) {
        return false;
      }
    }

    return true;
  }, [filters.repoId, filters.search, filters.status, isPRItem]);

  // Socket integration for real-time updates
  const { isConnected, lastEvent } = useTechDebtSocket({
    autoConnect: enableRealtime,
    onPRUpdate: useCallback((data) => {
      const updatedPR = data?.pr || data;
      if (!updatedPR) return;

      const normalizedPR = {
        ...updatedPR,
        type: updatedPR.type || 'pull_request',
        timestamp: updatedPR.timestamp || updatedPR.createdAt || updatedPR.updatedAt || new Date().toISOString()
      };

      if (!doesItemMatchFilters(normalizedPR)) {
        return;
      }

      setFeed((prevFeed) => {
        const merged = mergeFeedItems(prevFeed, [normalizedPR]);
        setStats((prevStats) => ({ ...prevStats, ...computeStats(merged, prevStats.total) }));
        return merged;
      });
    }, [computeStats, doesItemMatchFilters, mergeFeedItems])
  });

  const fetchGatekeeperFeed = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (!filters.repoId) {
      setFeed([]);
      setHasMore(false);
      setStats({ ...EMPTY_STATS });
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pageNum,
        limit: PAGE_SIZE,
        status: filters.status,
        search: filters.search,
        repoId: filters.repoId
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await api.get('/tech-debt/gatekeeper-feed', { params });

      const payload = response.data || {};
      const newItems = Array.isArray(payload)
        ? payload
        : (payload.items || payload.prs || payload.feed || []);
      const total = Number(payload.total ?? newItems.length);

      setFeed((prev) => {
        const updatedFeed = isLoadMore ? mergeFeedItems(prev, newItems) : newItems;

        if (payload.stats) {
          setStats({
            ...EMPTY_STATS,
            ...payload.stats,
            total: payload.stats.total || total,
            passCount: payload.stats.passCount || 0,
            blockCount: payload.stats.blockCount || 0,
            warnCount: payload.stats.warnCount || 0,
            pendingCount: payload.stats.pendingCount || 0,
            passRate: payload.stats.passRate || 0,
            avgGatekeeperScore: payload.stats.avgGatekeeperScore || 0,
            mergeReadyCount: payload.stats.mergeReadyCount || payload.stats.passCount || 0,
            reviewQueueCount: payload.stats.reviewQueueCount || ((payload.stats.warnCount || 0) + (payload.stats.pendingCount || 0)),
            attentionCount: payload.stats.attentionCount || ((payload.stats.blockCount || 0) + (payload.stats.warnCount || 0)),
            readinessIndex: payload.stats.readinessIndex || 0,
            scoreBuckets: {
              ...EMPTY_STATS.scoreBuckets,
              ...(payload.stats.scoreBuckets || {})
            }
          });
        } else {
          setStats(computeStats(updatedFeed, total));
        }

        return updatedFeed;
      });

      setHasMore(Boolean(payload.hasMore ?? (pageNum * PAGE_SIZE < total)));

      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error('Failed to fetch gatekeeper feed:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PAGE_SIZE, computeStats, filters.repoId, filters.search, filters.status, mergeFeedItems]);

  // Initial fetch
  useEffect(() => {
    if (!filters.repoId) {
      setFeed([]);
      setHasMore(false);
      setPage(1);
      setStats({ ...EMPTY_STATS });
      setLoading(false);
      return;
    }

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
    if (!filters.repoId) {
      setFeed([]);
      setHasMore(false);
      setPage(1);
      setStats({ ...EMPTY_STATS });
      return;
    }

    setPage(1);
    fetchGatekeeperFeed(1, false);
  }, [fetchGatekeeperFeed, filters.repoId]);

  useEffect(() => {
    autoAnalyzeTriggeredRef.current.clear();
    inFlightAutoAnalyzeRef.current.clear();
  }, [filters.repoId]);

  useEffect(() => {
    if (!autoAnalyzePending || !filters.repoId || feed.length === 0) {
      return;
    }

    const pendingPRs = feed
      .filter((item) => isPRItem(item) && item.status === 'PENDING' && Number.isFinite(Number(item.prNumber)))
      .slice(0, Math.max(1, autoAnalyzeLimit));

    pendingPRs.forEach((pr) => {
      const key = `${filters.repoId}#${pr.prNumber}`;
      if (autoAnalyzeTriggeredRef.current.has(key) || inFlightAutoAnalyzeRef.current.has(key)) {
        return;
      }

      inFlightAutoAnalyzeRef.current.add(key);
      api.post('/tech-debt/analyze-pr', { repoId: filters.repoId, prNumber: pr.prNumber })
        .then(() => {
          autoAnalyzeTriggeredRef.current.add(key);
        })
        .catch((analyzeError) => {
          console.error(`Auto analyze failed for PR #${pr.prNumber}:`, analyzeError);
        })
        .finally(() => {
          inFlightAutoAnalyzeRef.current.delete(key);
        });
    });
  }, [autoAnalyzeLimit, autoAnalyzePending, feed, filters.repoId, isPRItem]);

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
