import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import { ChevronLeft, Zap, TrendingUp, DollarSign, Leaf, MapPin, Calendar, ArrowUpRight } from 'lucide-react-native';
import { Colors } from '../styles/GlobalStyles';
import statsService from '../services/statsService';

const { width } = Dimensions.get('window');

const Card = ({ title, value, unit, icon: Icon, color, subtitle }) => (
    <View style={[styles.statCard, { backgroundColor: Colors.cardBg }]}>
        <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                <Icon size={20} color={color} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardValue}>{value} <Text style={styles.cardUnit}>{unit}</Text></Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
    </View>
);

export default function ChargingInsightsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await statsService.getAggregatedStats();
            setStats(data);

            // Prepare Chart Data (Last 7 Sessions or Days)
            // Reverse to show oldest to newest left-to-right
            const chartRaw = data.history.slice(0, 7).reverse().map(item => ({
                value: item.energyDelivered,
                label: new Date(item.timestamp).getDate().toString(), // Day of month
                frontColor: Colors.statusGreen,
                topLabelComponent: () => (
                    <Text style={{ color: '#fff', fontSize: 10, marginBottom: 2 }}>{item.energyDelivered}</Text>
                )
            }));

            setChartData(chartRaw);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.statusGreen} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Charging Insights</Text>
                    <Text style={styles.headerSubtitle}>Your green impact & savings</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Green Level Badge */}
                <View style={styles.levelBadge}>
                    <Leaf size={16} color={Colors.statusGreen} style={{ marginRight: 6 }} />
                    <Text style={styles.levelText}>Current Status: <Text style={styles.levelValue}>{stats?.greenLevel}</Text></Text>
                </View>

                {/* Main Stats Grid */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    <Card
                        title="Total Energy"
                        value={stats?.totalEnergy}
                        unit="kWh"
                        icon={Zap}
                        color="#FFD700"
                        subtitle={`${stats?.totalSessions} Sessions`}
                    />
                    <View style={{ width: 12 }} />
                    <Card
                        title="CO₂ Saved"
                        value={stats?.totalCo2Saved}
                        unit="kg"
                        icon={Leaf}
                        color={Colors.statusGreen}
                        subtitle="vs ICE Vehicle"
                    />
                    <View style={{ width: 12 }} />
                    <Card
                        title="Money Saved"
                        value={`₹${stats?.totalMoneySaved}`}
                        unit=""
                        icon={DollarSign}
                        color="#4facfe"
                        subtitle="Estimated"
                    />
                </ScrollView>

                {/* Chart Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Energy Trends (Last 7 Sessions)</Text>
                    <View style={styles.chartContainer}>
                        {chartData.length > 0 ? (
                            <BarChart
                                data={chartData}
                                barWidth={28}
                                noOfSections={4}
                                barBorderRadius={4}
                                frontColor={Colors.statusGreen}
                                yAxisThickness={0}
                                xAxisThickness={0}
                                yAxisTextStyle={{ color: '#666' }}
                                xAxisLabelTextStyle={{ color: '#aaa' }}
                                hideRules
                                isAnimated
                                height={200}
                                width={width - 80} // Adjust for padding
                            />
                        ) : (
                            <View style={styles.emptyChart}>
                                <Text style={styles.emptyText}>No charging data yet</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Recent History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Sessions</Text>
                    {stats?.history?.length === 0 && (
                        <Text style={styles.emptyText}>Your charging history will appear here.</Text>
                    )}
                    {stats?.history?.map((item) => (
                        <View key={item.id} style={styles.historyItem}>
                            <View style={styles.historyLeft}>
                                <View style={styles.dateBox}>
                                    <Text style={styles.dateDay}>{new Date(item.timestamp).getDate()}</Text>
                                    <Text style={styles.dateMonth}>{new Date(item.timestamp).toLocaleString('default', { month: 'short' })}</Text>
                                </View>
                                <View>
                                    <Text style={styles.stationName} numberOfLines={1}>{item.stationName}</Text>
                                    <View style={styles.metaRow}>
                                        <MapPin size={12} color="#666" style={{ marginRight: 4 }} />
                                        <Text style={styles.locationText}>{item.location || 'Unknown'}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.historyRight}>
                                <Text style={styles.energyText}>{item.energyDelivered} kWh</Text>
                                <Text style={styles.costText}>-₹{item.cost}</Text>
                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.matteBlack,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: Colors.matteBlack,
        zIndex: 10,
    },
    backBtn: {
        marginRight: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#888',
    },
    scrollContent: {
        paddingTop: 10,
    },

    // Level Badge
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        alignSelf: 'flex-start',
        marginHorizontal: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.2)'
    },
    levelText: {
        color: '#aaa',
        fontSize: 12,
    },
    levelValue: {
        color: Colors.statusGreen,
        fontWeight: 'bold',
    },

    // Stats Cards
    cardsScroll: {
        marginBottom: 30,
    },
    statCard: {
        width: 140,
        height: 140,
        padding: 16,
        borderRadius: 20,
        justifyContent: 'space-between',
        // Shadow/Glass effect
        borderWidth: 1,
        borderColor: '#333',
    },
    cardHeader: {
        marginBottom: 8,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    cardValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    cardUnit: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'normal',
    },
    cardSubtitle: {
        color: '#666',
        fontSize: 10,
    },

    // Sections
    section: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    chartContainer: {
        backgroundColor: Colors.cardBg,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyChart: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // History List
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.cardBg,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dateBox: {
        backgroundColor: '#222',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
        marginRight: 12,
    },
    dateDay: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    dateMonth: {
        color: '#888',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    stationName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        color: '#666',
        fontSize: 12,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    energyText: {
        color: Colors.statusGreen,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    costText: {
        color: '#888',
        fontSize: 12,
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 20,
    }
});
