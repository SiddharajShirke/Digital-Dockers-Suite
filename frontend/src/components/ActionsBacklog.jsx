import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  FaBell,
  FaFilter,
  FaEnvelope,
  FaExclamationTriangle,
  FaSync,
  FaShieldAlt,
  FaCodeBranch,
  FaTasks,
  FaFileCode,
} from "react-icons/fa";

const ActionsBacklog = ({ isDarkMode, repoId }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [recipientByCard, setRecipientByCard] = useState({});
  const [actionStateByCard, setActionStateByCard] = useState({});

  const getCardKey = (card) => card.id || card._id || `${card.type || "card"}-${card.prNumber || card.path || "unknown"}`;

  const isPRCard = (card) => card?.type === "pull_request" || Number.isFinite(Number(card?.prNumber));

  const resolveScore = (card) => {
    const score = Number(
      card?.healthScore?.current ??
      card?.gatekeeper?.score ??
      card?.gatekeeperScore?.overall ??
      card?.riskScore ??
      card?.risk_score ??
      0,
    );

    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const resolveTags = (card) => {
    const tagSet = new Set(
      (Array.isArray(card?.tags) ? card.tags : [])
        .map((tag) => String(tag || "").trim().toUpperCase())
        .filter(Boolean),
    );
    const status = String(card?.status || "").toUpperCase();
    const type = String(card?.type || "").toLowerCase();
    const score = resolveScore(card);

    if (score < 80) tagSet.add("HIGH");
    if (score < 70) tagSet.add("CRITICAL");
    if (score < 80) tagSet.add("UNDER_80");
    if (score < 70) tagSet.add("UNDER_70");
    if (status === "BLOCK" || status === "HIGH_RISK") tagSet.add("CRITICAL");
    if (status === "WARN" || status === "WATCH") tagSet.add("RISK");
    if (type === "refactor_task") tagSet.add("TASK");
    if (type === "high_risk_file") tagSet.add("FILE RISK");
    if (isPRCard(card)) tagSet.add("PR");

    if (tagSet.size === 0) tagSet.add("RISK");
    return Array.from(tagSet);
  };

  const resolveTypeIcon = (card) => {
    const type = String(card?.type || "").toLowerCase();
    if (isPRCard(card)) return <FaCodeBranch size={12} />;
    if (type === "refactor_task") return <FaTasks size={12} />;
    if (type === "high_risk_file") return <FaFileCode size={12} />;
    return <FaShieldAlt size={12} />;
  };

  const resolveTypeLabel = (card) => {
    const type = String(card?.type || "").toLowerCase();
    if (isPRCard(card)) return "PULL REQUEST";
    if (type === "refactor_task") return "TASK CARD";
    if (type === "high_risk_file") return "FILE CARD";
    return "RISK CARD";
  };

  const fetchSafetyCards = async () => {
    if (!repoId) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get("/tech-debt/gatekeeper-feed", {
        params: {
          repoId,
          limit: 30,
          page: 1,
          onlyPullRequests: true,
          tags: "HIGH,CRITICAL",
          maxScore: 80,
        },
      });

      setCards(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error("Error fetching safety cards", error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafetyCards();
  }, [repoId]);

  const handleNotifyAction = async (card) => {
    const cardKey = getCardKey(card);
    const recipientEmails = String(recipientByCard[cardKey] || "").trim();

    if (!recipientEmails) {
      setActionStateByCard((prev) => ({
        ...prev,
        [cardKey]: {
          type: "error",
          message: "Enter at least one recipient email.",
        },
      }));
      return;
    }

    setActionStateByCard((prev) => ({
      ...prev,
      [cardKey]: {
        type: "loading",
        message: "Generating narrative and notifying...",
      },
    }));

    try {
      const { data } = await api.post("/tech-debt/safety-actions/notify", {
        repoId,
        card,
        recipientEmails,
      });

      const emailSent = data?.delivery?.email?.sent?.length || 0;
      const inAppSent = data?.delivery?.inApp?.sentCount || 0;
      const invalidEmailCount = data?.invalidEmails?.length || 0;
      const emailFailureReason =
        data?.delivery?.email?.reason ||
        data?.delivery?.email?.failed?.[0]?.error ||
        "";
      const publicFallbackReason = data?.narrativeMeta?.reason || "NVIDIA access pending";
      const llmFallbackNote = data?.narrativeMeta?.fallbackUsed
        ? `, Narrative fallback: ${publicFallbackReason}`
        : "";

      setActionStateByCard((prev) => ({
        ...prev,
        [cardKey]: {
          type: data?.partialSuccess ? "success" : "warning",
          message: `Email sent: ${emailSent}, Admin in-app: ${inAppSent}${invalidEmailCount ? `, Invalid emails: ${invalidEmailCount}` : ""}${emailFailureReason ? `, Email error: ${emailFailureReason}` : ""}${llmFallbackNote}`,
          narrative: data?.narrative || "",
        },
      }));
    } catch (error) {
      setActionStateByCard((prev) => ({
        ...prev,
        [cardKey]: {
          type: "error",
          message: error?.response?.data?.message || "Notify action failed.",
        },
      }));
    }
  };

  const filteredCards = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return cards
      .map((card) => ({
        ...card,
        _score: resolveScore(card),
        _tags: resolveTags(card),
      }))
      .filter((card) => {
        if (tagFilter !== "ALL" && !card._tags.includes(tagFilter)) return false;

        if (!normalizedSearch) return true;

        const searchableText = [
          card.title,
          card.description,
          card.path,
          card.author,
          card.repoId,
          card.prNumber,
          card.status,
          card._tags.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort((a, b) => b._score - a._score);
  }, [cards, searchTerm, tagFilter]);

  const filterTags = ["ALL", "HIGH", "CRITICAL", "UNDER_80", "UNDER_70", "PR"];

  if (loading)
    return (
      <div
        className={`p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900/65 border-slate-700 text-white" : "bg-white border-slate-200"}`}
      >
        Loading Safety Actions...
      </div>
    );

  if (!repoId) {
    return (
      <div
        className={`rounded-2xl p-8 text-center transition-colors border ${isDarkMode ? "bg-slate-900/65 border-slate-700 text-gray-400" : "bg-white border-slate-200 text-gray-500"}`}
      >
        <FaFilter className="mx-auto mb-3 text-indigo-400 opacity-50" size={32} />
        <p className="text-sm font-medium">Connect a repository to activate Safety Actions</p>
      </div>
    );
  }

  return (
    <div
      className={`relative z-0 rounded-2xl border p-5 transition-colors ${isDarkMode ? "bg-slate-900/65 border-slate-700" : "bg-white border-slate-200"}`}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
              SAFETY ACTIONS
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Fetching only high/critical pull requests with score below 80, including critical below 70.
            </p>
          </div>

          <button
            onClick={fetchSafetyCards}
            className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${isDarkMode
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
          >
            <FaSync size={12} />
            Refresh Cards
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, status, tag, author, PR number"
            className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode
              ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
              : "bg-white border-slate-300 text-slate-900"
              }`}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {filterTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${tagFilter === tag
                ? "bg-cyan-600 text-white"
                : isDarkMode
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {filteredCards.map((card) => {
          const cardKey = getCardKey(card);
          const uiState = actionStateByCard[cardKey] || null;

          return (
            <div
              key={cardKey}
              className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`h-7 w-7 rounded-lg inline-flex items-center justify-center ${isDarkMode ? "bg-slate-800 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
                      {resolveTypeIcon(card)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold tracking-[0.06em] ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                      {resolveTypeLabel(card)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${String(card.status || "").toUpperCase() === "BLOCK" || String(card.status || "").toUpperCase() === "HIGH_RISK"
                      ? "bg-red-100 text-red-700"
                      : String(card.status || "").toUpperCase() === "WARN" || String(card.status || "").toUpperCase() === "WATCH"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                      }`}>
                      {String(card.status || "PENDING").toUpperCase()}
                    </span>
                  </div>

                  <p className={`mt-2 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    {isPRCard(card) ? `#${card.prNumber} ${card.title || "Untitled PR"}` : card.title || "Gatekeeper Card"}
                  </p>

                  <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {card.path || card.description || "No description available"}
                  </p>

                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {card._tags.map((tag) => (
                      <span
                        key={`${cardKey}-${tag}`}
                        className={`text-[11px] px-2 py-1 rounded-full font-semibold ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {card._score}
                  </div>
                  <div className={`text-[11px] uppercase tracking-[0.1em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Gatekeeper Score
                  </div>
                </div>
              </div>

              {card?.analysisResults?.aiScan?.findings?.[0]?.message && (
                <div className={`mt-3 rounded-lg border p-2.5 text-xs ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  <span className="font-semibold">AI Finding:</span> {card.analysisResults.aiScan.findings[0].message}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <label className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Recipient Emails (comma separated)
                  </label>
                  <div className="relative mt-1">
                    <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} size={12} />
                    <input
                      type="text"
                      value={recipientByCard[cardKey] || ""}
                      onChange={(e) =>
                        setRecipientByCard((prev) => ({
                          ...prev,
                          [cardKey]: e.target.value,
                        }))
                      }
                      placeholder="example@company.com, lead@company.com"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm ${isDarkMode
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                        : "bg-white border-slate-300 text-slate-900"
                        }`}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleNotifyAction(card)}
                  disabled={uiState?.type === "loading"}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${uiState?.type === "loading"
                    ? "bg-cyan-400 text-white"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white"
                    }`}
                >
                  <FaBell size={12} />
                  {uiState?.type === "loading" ? "Processing..." : "Notify Action Needed"}
                </button>
              </div>

              {isPRCard(card) && (
                <p className={`mt-2 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  PR commit intelligence will be included in the NVIDIA narrative.
                </p>
              )}

              {uiState && uiState.type !== "loading" && (
                <div
                  className={`mt-3 rounded-lg border p-2.5 text-xs ${uiState.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : uiState.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-red-200 bg-red-50 text-red-800"
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <FaExclamationTriangle className="mt-0.5" />
                    <div>
                      <p className="font-semibold">{uiState.message}</p>
                      {uiState.narrative && (
                        <p className="mt-1 line-clamp-3">{uiState.narrative}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCards.length === 0 && (
          <div
            className={`rounded-xl border p-6 text-center text-sm ${isDarkMode ? "border-slate-700 bg-slate-900/70 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"}`}
          >
            No cards match current filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionsBacklog;
