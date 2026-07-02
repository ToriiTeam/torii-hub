import { useState } from 'react'
import { AccountProvider } from '../features/meta-ads/context/AccountContext'
import { DateRangeProvider } from '../features/meta-ads/context/DateRangeContext'
import { SelectionProvider } from '../features/meta-ads/context/SelectionContext'
import { SensitiveDataProvider } from '../features/meta-ads/context/SensitiveDataContext'
import { Header } from '../features/meta-ads/components/layout/Header'
import { TabNav } from '../features/meta-ads/components/layout/TabNav'
import { MetricsBar } from '../features/meta-ads/components/tabs/MetricsBar'
import { CampaignsTab } from '../features/meta-ads/components/tabs/CampaignsTab'
import { AdSetsTab } from '../features/meta-ads/components/tabs/AdSetsTab'
import { AdsTab } from '../features/meta-ads/components/tabs/AdsTab'
import { DetailPanel } from '../features/meta-ads/components/detail/DetailPanel'
import '../features/meta-ads/meta-ads.css'

type TabId = 'metricsbar' | 'campaigns' | 'adsets' | 'ads'

function MetaAdsContent() {
  const [activeTab, setActiveTab] = useState<TabId>('metricsbar')

  return (
    <div className="meta-ads-root">
      <Header />
      <TabNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabId)} />

      <main style={{ flex: 1, paddingBottom: 32 }}>
        {activeTab === 'metricsbar' && <MetricsBar />}
        {activeTab === 'campaigns'  && <CampaignsTab />}
        {activeTab === 'adsets'     && <AdSetsTab />}
        {activeTab === 'ads'        && <AdsTab />}
      </main>

      <DetailPanel />
    </div>
  )
}

export default function MetaAds() {
  return (
    <AccountProvider>
      <DateRangeProvider>
        <SelectionProvider>
          <SensitiveDataProvider>
            <MetaAdsContent />
          </SensitiveDataProvider>
        </SelectionProvider>
      </DateRangeProvider>
    </AccountProvider>
  )
}
