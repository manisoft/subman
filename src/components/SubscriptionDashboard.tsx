import React, { useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  Title3, 
  Body1, 
  CardPreview, 
  makeStyles, 
  tokens, 
  Divider,
  Caption1,
  Text,
  Badge,
  CounterBadge,
  ProgressBar,
  Spinner
} from '@fluentui/react-components';
import { 
  DataPieRegular,
  CalendarMonthRegular,
  WalletRegular,
  AlertRegular,
  DiamondRegular,
  MoneyRegular,
  CalendarMonthFilled
} from '@fluentui/react-icons';
import { Subscription } from '../types/models';

const useStyles = makeStyles({
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box',
  },
  dashboardContainer: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  card: {
    height: '100%',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column',
  },
  fullWidthCard: {
    gridColumn: '1 / -1',
    minHeight: '220px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    margin: '0 auto 16px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  statCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600',
    marginTop: '8px',
    color: tokens.colorBrandForeground1,
  },
  statLabel: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground2,
  },
  categoryChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  categoryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  categoryLabel: {
    width: '120px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  progressBar: {
    flex: 1,
  },
  upcoming: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  upcomingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusSmall,
    boxShadow: tokens.shadow2,
  },
  upcomingName: {
    fontWeight: '500',
  },
  upcomingDate: {
    color: tokens.colorNeutralForeground2,
  },
  upcomingPrice: {
    fontWeight: '600',
  },
  dueSoon: {
    color: tokens.colorPaletteRedForeground1,
  },
  dueNormal: {
    color: tokens.colorNeutralForeground1,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
    width: '100%',
  },
});

interface SubscriptionDashboardProps {
  subscriptions: Subscription[];
  isLoading: boolean;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ subscriptions, isLoading }) => {
  const styles = useStyles();

  const totalMonthlyCost = useMemo(() => {
    return subscriptions.reduce((total, sub) => {
      let cost = sub.cost;
      
      // Convert to monthly cost based on billing cycle
      if (sub.billingCycle.toLowerCase() === 'yearly') {
        cost = cost / 12;
      } else if (sub.billingCycle.toLowerCase() === 'quarterly') {
        cost = cost / 3;
      }
      
      return total + cost;
    }, 0);
  }, [subscriptions]);

  const totalYearlyCost = useMemo(() => {
    return totalMonthlyCost * 12;
  }, [totalMonthlyCost]);

  const categoryCosts = useMemo(() => {
    const categories: { [key: string]: number } = {};
    
    subscriptions.forEach(sub => {
      // We don't have actual category names, so using categoryId as string
      const categoryName = `Category ${sub.categoryId}`;
      if (!categories[categoryName]) {
        categories[categoryName] = 0;
      }
      
      let cost = sub.cost;
      // Convert to monthly cost based on billing cycle
      if (sub.billingCycle.toLowerCase() === 'yearly') {
        cost = cost / 12;
      } else if (sub.billingCycle.toLowerCase() === 'quarterly') {
        cost = cost / 3;
      }
      
      categories[categoryName] += cost;
    });
    
    // Convert to array and sort by cost descending
    return Object.entries(categories)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [subscriptions]);

  const upcomingPayments = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return subscriptions
      .filter(sub => {
        const nextBillingDate = new Date(sub.nextBillingDate);
        return nextBillingDate >= now && nextBillingDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => {
        return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime();
      });
  }, [subscriptions]);

  const getDaysUntilBilling = (nextBillingDate: Date | string) => {
    const now = new Date();
    const billingDate = new Date(nextBillingDate);
    const diffTime = billingDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading subscription data..." />
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <Title3 as="h1">Subscription Dashboard</Title3>
      <Body1>Track and analyze your subscription expenses</Body1>
      
      <div className={styles.container}>
        {/* Total Cost Card */}
        <Card className={styles.card}>
          <CardHeader
            image={
              <div className={styles.iconContainer}>
                <MoneyRegular />
              </div>
            }
            header={<Title3>Monthly Cost</Title3>}
          />
          <CardPreview>
            <div className={styles.metricsGrid}>
              <div className={styles.statCard}>
                <Text className={styles.statLabel}>Monthly</Text>
                <Text className={styles.statValue}>${totalMonthlyCost.toFixed(2)}</Text>
              </div>
              <div className={styles.statCard}>
                <Text className={styles.statLabel}>Yearly</Text>
                <Text className={styles.statValue}>${totalYearlyCost.toFixed(2)}</Text>
              </div>
            </div>
          </CardPreview>
        </Card>

        {/* Upcoming Payments Card */}
        <Card className={styles.card}>
          <CardHeader
            image={
              <div className={styles.iconContainer}>
                <CalendarMonthRegular />
              </div>
            }
            header={<Title3>Upcoming Payments</Title3>}
          />
          <CardPreview>
            <div className={styles.upcoming}>
              {upcomingPayments.length > 0 ? (
                upcomingPayments.slice(0, 3).map((sub) => {
                  const daysUntil = getDaysUntilBilling(sub.nextBillingDate);
                  const isDueSoon = daysUntil <= 3;
                  
                  return (
                    <div key={sub.id} className={styles.upcomingItem}>
                      <div>
                        <Text className={styles.upcomingName}>{sub.name}</Text>
                        <div>
                          <Text className={styles.upcomingDate}>
                            {new Date(sub.nextBillingDate).toLocaleDateString()} 
                            {isDueSoon && (
                              <Badge appearance="filled" color="danger" style={{ marginLeft: '8px' }}>
                                Due soon
                              </Badge>
                            )}
                          </Text>
                        </div>
                      </div>
                      <Text className={styles.upcomingPrice}>${sub.cost.toFixed(2)}</Text>
                    </div>
                  );
                })
              ) : (
                <Text>No upcoming payments in the next 30 days</Text>
              )}
              {upcomingPayments.length > 3 && (
                <Caption1>+{upcomingPayments.length - 3} more in the next 30 days</Caption1>
              )}
            </div>
          </CardPreview>
        </Card>

        {/* Total Subscriptions Card */}
        <Card className={styles.card}>
          <CardHeader
            image={
              <div className={styles.iconContainer}>
                <DiamondRegular />
              </div>
            }
            header={<Title3>Subscription Stats</Title3>}
          />
          <CardPreview>
            <div className={styles.metricsGrid}>
              <div className={styles.statCard}>
                <Text className={styles.statLabel}>Total Subscriptions</Text>
                <Text className={styles.statValue}>{subscriptions.length}</Text>
              </div>
              <div className={styles.statCard}>
                <Text className={styles.statLabel}>Categories</Text>
                <Text className={styles.statValue}>{categoryCosts.length}</Text>
              </div>
            </div>
          </CardPreview>
        </Card>

        {/* Category Breakdown Card */}
        <Card className={`${styles.card} ${styles.fullWidthCard}`}>
          <CardHeader
            image={
              <div className={styles.iconContainer}>
                <DataPieRegular />
              </div>
            }
            header={<Title3>Spending by Category</Title3>}
          />
          <CardPreview>
            <div className={styles.categoryChart}>
              {categoryCosts.map((category, index) => {
                const percentage = (category.cost / totalMonthlyCost) * 100;
                
                return (
                  <div key={index} className={styles.categoryRow}>
                    <Text className={styles.categoryLabel}>{category.name}</Text>
                    <ProgressBar 
                      value={percentage} 
                      max={100}
                      thickness="medium"
                      color="brand"
                      className={styles.progressBar}
                    />
                    <Text>${category.cost.toFixed(2)}</Text>
                    <Badge>{percentage.toFixed(0)}%</Badge>
                  </div>
                );
              })}
            </div>
          </CardPreview>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionDashboard; 