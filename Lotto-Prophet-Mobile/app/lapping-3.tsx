import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme, type AppColors } from './context/ThemeContext';
import {
  fetchDrawSources,
  getDrawDisplayName,
  type DrawSource,
  type DrawFlat,
} from './lib/draws';
import { fetchLapping3, type Lapping3Response } from './lib/tools';

type ColumnsMode = 'main' | 'machine' | 'all';

const NUM_PATTERN_ROWS = 3;
const ACCENT = '#F59E0B';

/** Default lapping-3 reference pattern (N1–N5 only, M columns empty) */
const DEFAULT_N_ROWS: string[][] = [
  ['61', '60', '17', '8', '75'], // Row 1 (bottom)
  ['55', '28', '11', '6', '47'], // Row 2 (middle)
  ['53', '29', '22', '75', '82'], // Row 3 (top)
];

function getDefaultPattern(mode: ColumnsMode): string[][] {
  if (mode === 'machine') {
    return Array.from({ length: NUM_PATTERN_ROWS }, () => new Array(5).fill(''));
  }
  if (mode === 'all') {
    return DEFAULT_N_ROWS.map((row) => [...row, '', '', '', '', '']);
  }
  return DEFAULT_N_ROWS.map((row) => [...row]);
}

function getColumnLabels(mode: ColumnsMode): string[] {
  if (mode === 'machine') return ['M1', 'M2', 'M3', 'M4', 'M5'];
  if (mode === 'all')
    return ['N1', 'N2', 'N3', 'N4', 'N5', 'M1', 'M2', 'M3', 'M4', 'M5'];
  return ['N1', 'N2', 'N3', 'N4', 'N5'];
}

export default function Lapping3() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const flatListRef = useRef<FlatList>(null);

  const [sources, setSources] = useState<DrawSource[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [columnsMode, setColumnsMode] = useState<ColumnsMode>('main');
  const [limit, setLimit] = useState(200);

  // ── Pattern grid (3 rows × numCols) — pre-filled with defaults ──
  const [patternRows, setPatternRows] = useState<string[][]>(getDefaultPattern('main'));
  const patternRowsRef = useRef(patternRows);
  patternRowsRef.current = patternRows;

  const columnLabels = useMemo(() => getColumnLabels(columnsMode), [columnsMode]);

  const [result, setResult] = useState<Lapping3Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNavIndex, setActiveNavIndex] = useState<number | null>(null);

  // Cross-game search
  const [crossSources, setCrossSources] = useState<string[]>([]);
  const [crossResults, setCrossResults] = useState<Record<string, Lapping3Response>>({});

  const hasPatternValues = useMemo(
    () => patternRows.some((row) => row.some((v) => v.trim() !== '' && parseInt(v) > 0)),
    [patternRows],
  );

  // ── Load sources ──
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchDrawSources();
        setSources(data);
        if (data.length > 0) setSelectedSource(data[0].source);
      } catch (err: any) {
        setError(err.message || 'Failed to load sources');
      } finally {
        setSourcesLoading(false);
      }
    })();
  }, []);

  // ── Column mode change (resets pattern to defaults for that mode) ──
  const changeColumnsMode = useCallback((mode: ColumnsMode) => {
    setColumnsMode(mode);
    setPatternRows(getDefaultPattern(mode));
  }, []);

  // ── Grid cell edit ──
  const updateCell = useCallback(
    (rowIndex: number, colIndex: number, text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      setPatternRows((prev) => {
        const next = prev.map((row) => [...row]);
        next[rowIndex][colIndex] = cleaned;
        return next;
      });
    },
    [],
  );

  // ── Clear all pattern inputs ──
  const clearPattern = useCallback(() => {
    const numCols = columnsMode === 'all' ? 10 : 5;
    setPatternRows(
      Array.from({ length: NUM_PATTERN_ROWS }, () => new Array(numCols).fill('')),
    );
  }, [columnsMode]);

  // ── Restore defaults ──
  const loadDefaults = useCallback(() => {
    setPatternRows(getDefaultPattern(columnsMode));
  }, [columnsMode]);

  // ── Toggle cross-game source ──
  const toggleCrossSource = useCallback((src: string) => {
    setCrossSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src],
    );
  }, []);

  // ── Fill pattern from a draw (fills all rows from consecutive draws) ──
  const fillFromDraw = useCallback(
    (drawIndex: number) => {
      if (!result) return;
      const newRows = Array.from({ length: NUM_PATTERN_ROWS }, (_, ri) => {
        const gridRow = result.grid[drawIndex + ri];
        if (!gridRow) return new Array(getColumnLabels(columnsMode).length).fill('');
        return gridRow.map((v) => (v > 0 ? String(v) : ''));
      });
      setPatternRows(newRows);
    },
    [result, columnsMode],
  );

  // ── Run analysis (reads pattern from ref for stable closure) ──
  const runAnalysis = useCallback(async () => {
    if (!selectedSource) return;
    try {
      setLoading(true);
      setError(null);
      const rows = patternRowsRef.current.map((row) =>
        row.map((v) => {
          const n = parseInt(v, 10);
          return !isNaN(n) && n >= 1 && n <= 90 ? n : 0;
        }),
      );
      const anyPattern = rows.some((row) => row.some((v) => v !== 0));
      const patternArg = anyPattern ? rows : undefined;

      // Fetch primary + cross sources in parallel
      const allSources = [
        selectedSource,
        ...crossSources.filter((s) => s !== selectedSource),
      ];
      const results = await Promise.all(
        allSources.map((src) =>
          fetchLapping3(src, columnsMode, limit, patternArg),
        ),
      );

      setResult(results[0]);
      const newCross: Record<string, Lapping3Response> = {};
      allSources.forEach((src, i) => {
        newCross[src] = results[i];
      });
      setCrossResults(newCross);
      setActiveNavIndex(null);
    } catch (err: any) {
      setError(err.message || 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  }, [selectedSource, columnsMode, limit, crossSources]);

  // ── Auto-run on source / columns / limit change ──
  useEffect(() => {
    if (selectedSource) runAnalysis();
  }, [runAnalysis]);

  const scrollToRow = useCallback((rowIndex: number) => {
    setActiveNavIndex(rowIndex);
    flatListRef.current?.scrollToIndex({
      index: rowIndex,
      animated: true,
      viewPosition: 0.3,
    });
  }, []);

  // ─── Draw card renderer ───
  const renderDrawCard = useCallback(
    ({ item, index }: { item: DrawFlat; index: number }) => {
      if (!result) return null;
      const draw = item;
      const isLappingRow = result.lappingRows.includes(index);
      const mainIndices = result.columnNames
        .map((n, i) => (n.startsWith('N') ? i : -1))
        .filter((i) => i >= 0);
      const machineIndices = result.columnNames
        .map((n, i) => (n.startsWith('M') ? i : -1))
        .filter((i) => i >= 0);

      return (
        <View style={[styles.drawCard, isLappingRow && styles.drawCardLapping]}>
          <View style={styles.drawCardHeader}>
            <Text style={styles.eventText}>Draw #{draw.event_number}</Text>
            <Text style={styles.dateText}>
              {new Date(draw.date).toLocaleDateString()}
            </Text>
          </View>
          {mainIndices.length > 0 && (
            <View style={styles.numbersSection}>
              <Text style={styles.numbersLabel}>Main</Text>
              <View style={styles.numbersRow}>
                {mainIndices.map((ci) => {
                  const highlighted = result.highlights[index]?.[ci] ?? false;
                  return (
                    <View
                      key={ci}
                      style={[
                        styles.ball,
                        highlighted ? styles.ballHighlight : styles.ballNormal,
                      ]}
                    >
                      <Text
                        style={[styles.ballText, highlighted && styles.ballTextHighlight]}
                      >
                        {result.grid[index][ci]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {machineIndices.length > 0 && (
            <View style={styles.numbersSection}>
              <Text style={styles.numbersLabel}>Machine</Text>
              <View style={styles.numbersRow}>
                {machineIndices.map((ci) => {
                  const highlighted = result.highlights[index]?.[ci] ?? false;
                  return (
                    <View
                      key={ci}
                      style={[
                        styles.ball,
                        highlighted ? styles.ballHighlight : styles.ballNormal,
                      ]}
                    >
                      <Text
                        style={[styles.ballText, highlighted && styles.ballTextHighlight]}
                      >
                        {result.grid[index][ci]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      );
    },
    [result, styles],
  );

  // ─── List header ───
  const ListHeader = useMemo(
    () => (
      <>
        <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="git-network" size={40} color={ACCENT} />
          </View>
        </Animated.View>

        {/* ── Controls ── */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          style={styles.controlCard}
        >
          <Text style={styles.controlLabel}>SOURCE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {sources.map((s) => {
              const active = s.source === selectedSource;
              return (
                <TouchableOpacity
                  key={s.source}
                  onPress={() => setSelectedSource(s.source)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {getDrawDisplayName(s.source)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.controlLabel, { marginTop: 14 }]}>COLUMNS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {(
              [
                { key: 'main' as ColumnsMode, label: 'Main (N1–N5)' },
                { key: 'machine' as ColumnsMode, label: 'Machine (M1–M5)' },
                { key: 'all' as ColumnsMode, label: 'All' },
              ] as const
            ).map(({ key, label }) => {
              const active = key === columnsMode;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => changeColumnsMode(key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.controlLabel, { marginTop: 14 }]}>LAST N DRAWS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {[50, 100, 200, 500, 1000].map((n) => {
              const active = n === limit;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => setLimit(n)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {sources.length > 1 && (
            <>
              <Text style={[styles.controlLabel, { marginTop: 14 }]}>ALSO SEARCH IN</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
              >
                {sources
                  .filter((s) => s.source !== selectedSource)
                  .map((s) => {
                    const active = crossSources.includes(s.source);
                    return (
                      <TouchableOpacity
                        key={s.source}
                        onPress={() => toggleCrossSource(s.source)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {getDrawDisplayName(s.source)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </>
          )}
        </Animated.View>

        {/* ── Pattern Reference Grid ── */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(500)}
          style={styles.controlCard}
        >
          <View style={styles.patternHeader}>
            <Ionicons name="grid" size={16} color={ACCENT} />
            <Text style={[styles.controlLabel, { marginBottom: 0, marginLeft: 6 }]}>
              PATTERN REFERENCE
            </Text>
          </View>
          <Text style={styles.patternHint}>
            Enter numbers (1–90) per column to define the 3-row pattern to search.
            {'\n'}Pre-filled with the default lapping-3 reference.
          </Text>

          {result && result.grid.length >= NUM_PATTERN_ROWS && (
            <>
              <Text style={[styles.controlLabel, { marginTop: 4 }]}>FILL FROM DRAW</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.chipRow, { marginBottom: 10 }]}
              >
                {result.draws.slice(0, 30).map((draw, i) =>
                  i + NUM_PATTERN_ROWS <= result.draws.length ? (
                    <TouchableOpacity
                      key={i}
                      onPress={() => fillFromDraw(i)}
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>
                        #{draw.event_number}
                      </Text>
                    </TouchableOpacity>
                  ) : null,
                )}
              </ScrollView>
            </>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Column headers */}
              <View style={styles.gridHeaderRow}>
                <View style={styles.rowLabelCell} />
                {columnLabels.map((label) => (
                  <View key={label} style={styles.gridHeaderCell}>
                    <Text style={styles.gridHeaderText}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Input rows */}
              {patternRows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  <View style={styles.rowLabelCell}>
                    <Text style={styles.rowLabelText}>Row {ri + 1}</Text>
                  </View>
                  {row.map((val, ci) => (
                    <View key={ci} style={styles.gridInputCell}>
                      <TextInput
                        style={[
                          styles.gridInput,
                          val.trim() !== '' && styles.gridInputFilled,
                        ]}
                        value={val}
                        onChangeText={(text) => updateCell(ri, ci, text)}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="—"
                        placeholderTextColor={COLORS.textSecondary + '40'}
                        textAlign="center"
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.patternActions}>
            <TouchableOpacity onPress={clearPattern} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadDefaults} style={styles.defaultsButton}>
              <Ionicons name="refresh" size={16} color={ACCENT} />
              <Text style={styles.defaultsButtonText}>Defaults</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={runAnalysis}
              disabled={loading}
              style={[styles.runButton, loading && { opacity: 0.6 }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.runButtonInner}>
                  <Ionicons
                    name="search"
                    size={16}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.runButtonText}>
                    {hasPatternValues ? 'Search Pattern' : 'Show All Lapping'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Stats ── */}
        {result && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.statsRow}
          >
            <View style={styles.statBadge}>
              <Text style={styles.statLabel}>Draws</Text>
              <Text style={styles.statValue}>{result.total}</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statLabel}>Cols</Text>
              <Text style={styles.statValue}>{result.columnNames.length}</Text>
            </View>
            <View style={[styles.statBadge, styles.statBadgeHighlight]}>
              <Text style={styles.statLabelHighlight}>Lapping Found</Text>
              <Text style={styles.statValueHighlight}>
                {result.lappingRows.length}
              </Text>
            </View>
            {hasPatternValues && (
              <View style={[styles.statBadge, styles.statBadgePattern]}>
                <Text style={styles.statLabelPattern}>Mode</Text>
                <Text style={styles.statValuePattern}>Pattern</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── Cross-Game Summary ── */}
        {Object.keys(crossResults).length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(250).duration(500)}
            style={styles.controlCard}
          >
            <View style={styles.patternHeader}>
              <Ionicons name="layers" size={16} color={ACCENT} />
              <Text style={[styles.controlLabel, { marginBottom: 0, marginLeft: 6 }]}>
                CROSS-GAME RESULTS
              </Text>
            </View>
            {Object.entries(crossResults).map(([src, res]) => {
              const hits = res.lappingRows.length;
              const rate =
                res.total > 0
                  ? ((hits / res.total) * 100).toFixed(1)
                  : '0';
              const isPrimary = src === selectedSource;
              return (
                <TouchableOpacity
                  key={src}
                  onPress={() => setSelectedSource(src)}
                  style={[
                    styles.crossCard,
                    isPrimary && styles.crossCardPrimary,
                  ]}
                >
                  <View style={styles.crossCardRow}>
                    <Text style={styles.crossCardName}>
                      {getDrawDisplayName(src)}
                    </Text>
                    {isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.crossCardStats}>
                    <Text style={styles.crossCardStat}>
                      Draws: <Text style={styles.crossCardStatBold}>{res.total}</Text>
                    </Text>
                    <Text style={styles.crossCardStat}>
                      Hits: <Text style={[styles.crossCardStatBold, { color: ACCENT }]}>{hits}</Text>
                    </Text>
                    <Text style={styles.crossCardStat}>
                      Rate: <Text style={[styles.crossCardStatBold, { color: ACCENT }]}>{rate}%</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}
      </>
    ),
    [
      sources,
      selectedSource,
      columnsMode,
      limit,
      loading,
      error,
      result,
      patternRows,
      columnLabels,
      hasPatternValues,
      runAnalysis,
      clearPattern,
      fillFromDraw,
      loadDefaults,
      changeColumnsMode,
      updateCell,
      crossSources,
      crossResults,
      toggleCrossSource,
      COLORS,
      styles,
    ],
  );

  if (sourcesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Main list */}
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          ListHeaderComponent={ListHeader}
          data={result?.draws ?? []}
          keyExtractor={(item) => `${item.source}-${item.event_number}`}
          renderItem={renderDrawCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          ListEmptyComponent={
            !loading && result ? (
              <View style={styles.controlCard}>
                <Text style={styles.noResultsText}>
                  {hasPatternValues
                    ? 'No matches found for the entered pattern.'
                    : 'Not enough draws for lapping-3 analysis (minimum 3 required).'}
                </Text>
              </View>
            ) : null
          }
        />

        {/* Side navigation rail */}
        {result && result.lappingRows.length > 0 && (
          <View style={styles.sideNav}>
            <View style={styles.sideNavHeader}>
              <Ionicons name="bookmark" size={14} color={ACCENT} />
              <Text style={styles.sideNavCount}>
                {result.lappingRows.length}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {result.lappingRows.map((ri) => {
                const isActive = activeNavIndex === ri;
                return (
                  <TouchableOpacity
                    key={ri}
                    onPress={() => scrollToRow(ri)}
                    style={[
                      styles.sideNavItem,
                      isActive && styles.sideNavItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sideNavText,
                        isActive && styles.sideNavTextActive,
                      ]}
                    >
                      {result.draws[ri]?.event_number}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

/** Amber accent palette — consistent with lapping-2 structure */
const createStyles = (COLORS: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
    },
    loadingText: { color: COLORS.textSecondary, marginTop: 12, fontSize: 15 },
    listContent: { padding: 16, paddingBottom: 40 },

    header: { alignItems: 'center', marginBottom: 20 },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: `${ACCENT}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
    headerSubtitle: {
      fontSize: 14,
      color: COLORS.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },

    controlCard: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    controlLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: COLORS.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    chipRow: { flexDirection: 'row', marginBottom: 4 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: COLORS.background,
      marginRight: 8,
      borderWidth: 1,
      borderColor: COLORS.border ?? '#ddd',
    },
    chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    chipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
    chipTextActive: { color: '#fff' },

    // ── Pattern grid ──
    patternHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    patternHint: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginBottom: 12,
      lineHeight: 17,
    },
    gridHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    gridHeaderCell: { width: 50, alignItems: 'center', paddingVertical: 4 },
    gridHeaderText: {
      fontSize: 11,
      fontWeight: '700',
      color: ACCENT,
      letterSpacing: 0.5,
    },
    gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowLabelCell: { width: 50, paddingRight: 4, justifyContent: 'center' },
    rowLabelText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
    gridInputCell: { width: 50, paddingHorizontal: 2 },
    gridInput: {
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border ?? '#ddd',
      borderRadius: 8,
      paddingVertical: 8,
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.text,
    },
    gridInputFilled: {
      borderColor: ACCENT,
      backgroundColor: `${ACCENT}10`,
    },

    // ── Buttons ──
    patternActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
      flexWrap: 'wrap',
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: COLORS.border ?? '#ddd',
    },
    clearButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
    defaultsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: ACCENT,
    },
    defaultsButtonText: { fontSize: 14, fontWeight: '500', color: ACCENT },
    runButton: {
      flex: 1,
      backgroundColor: ACCENT,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      minWidth: 130,
    },
    runButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    runButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    errorBox: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    errorText: { color: '#DC2626', fontSize: 14 },

    // ── Stats ──
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    statBadge: {
      backgroundColor: COLORS.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: COLORS.border ?? '#ddd',
    },
    statBadgeHighlight: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
    statBadgePattern: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
    statLabel: { fontSize: 11, color: COLORS.textSecondary },
    statValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    statLabelHighlight: { fontSize: 11, color: '#065F46' },
    statValueHighlight: { fontSize: 14, fontWeight: '600', color: '#065F46' },
    statLabelPattern: { fontSize: 11, color: '#92400E' },
    statValuePattern: { fontSize: 14, fontWeight: '600', color: '#92400E' },

    // ── Draw cards ──
    drawCard: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    drawCardLapping: { borderLeftWidth: 3, borderLeftColor: ACCENT },
    drawCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    eventText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
    dateText: { fontSize: 12, color: COLORS.textSecondary },
    numbersSection: { marginBottom: 6 },
    numbersLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: COLORS.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    numbersRow: { flexDirection: 'row', gap: 8 },

    ball: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ballNormal: { backgroundColor: `${ACCENT}15` },
    ballHighlight: {
      backgroundColor: '#FCD34D',
      borderWidth: 2,
      borderColor: ACCENT,
    },
    ballText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
    ballTextHighlight: { color: '#78350F', fontWeight: '700' },

    noResultsText: {
      fontSize: 15,
      color: COLORS.textSecondary,
      textAlign: 'center',
      paddingVertical: 20,
    },

    // ── Side nav ──
    sideNav: {
      width: 52,
      backgroundColor: COLORS.card,
      borderLeftWidth: 1,
      borderLeftColor: COLORS.border ?? '#ddd',
      paddingTop: 4,
    },
    sideNavHeader: {
      alignItems: 'center',
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border ?? '#ddd',
      paddingTop: 4,
    },
    sideNavCount: {
      fontSize: 10,
      fontWeight: '700',
      color: ACCENT,
      marginTop: 2,
    },
    sideNavItem: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
    sideNavItemActive: { backgroundColor: `${ACCENT}20` },
    sideNavText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
    sideNavTextActive: { color: ACCENT, fontWeight: '700' },

    // ── Cross-game summary ──
    crossCard: {
      backgroundColor: COLORS.background,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: COLORS.border ?? '#ddd',
    },
    crossCardPrimary: {
      borderColor: ACCENT,
      backgroundColor: `${ACCENT}10`,
    },
    crossCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    crossCardName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    primaryBadge: {
      backgroundColor: `${ACCENT}20`,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    primaryBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: ACCENT,
      letterSpacing: 0.5,
    },
    crossCardStats: { flexDirection: 'row', gap: 12 },
    crossCardStat: { fontSize: 12, color: COLORS.textSecondary },
    crossCardStatBold: { fontWeight: '700', color: COLORS.text },
  });
