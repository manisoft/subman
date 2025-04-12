import React from 'react';
import { makeStyles, Title1, Divider, TabList, Tab, SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { SubscriptionList } from './SubscriptionList';
import SubscriptionDashboard from './SubscriptionDashboard';
import { useDashboardData } from '../hooks/useDashboardData';

const useStyles = makeStyles({
  container: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContent: {
    marginTop: '20px',
  }
});

export const Dashboard: React.FC = () => {
  const styles = useStyles();
  const { subscriptions, isLoading } = useDashboardData();
  const [selectedTab, setSelectedTab] = React.useState('analytics');

  const handleTabSelect = (event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as string);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title1>Subscription Management</Title1>
      </div>
      
      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
        <Tab value="analytics">Analytics</Tab>
        <Tab value="subscriptions">My Subscriptions</Tab>
      </TabList>
      
      <Divider />
      
      <div className={styles.tabContent}>
        {selectedTab === 'analytics' ? (
          <SubscriptionDashboard 
            subscriptions={subscriptions}
            isLoading={isLoading}
          />
        ) : (
          <SubscriptionList />
        )}
      </div>
    </div>
  );
}; 