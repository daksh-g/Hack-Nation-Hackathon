import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { NavBubbles } from './components/layout/NavBubbles'
import { PulseView } from './views/PulseView/PulseView'
import { AlertsView } from './views/AlertsView'
import { AskNexusView } from './views/AskNexusView'
import { DecisionExplorerView } from './views/DecisionExplorerView'
import { DemoView } from './views/DemoView'
import { BriefingView } from './views/BriefingView'
import { ImmuneScanView } from './views/ImmuneScanView'
import { PeopleView } from './views/PeopleView'
import { TaskGraphView } from './views/TaskGraphView'

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-canvas overflow-hidden">
      <NavBubbles />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          {/* Full-screen cinematic demo — no sidebar/topbar */}
          <Route path="/demo" element={<DemoView />} />

          {/* Standard app views with layout */}
          <Route path="/pulse" element={<Layout><PulseView /></Layout>} />
          <Route path="/alerts" element={<Layout><AlertsView /></Layout>} />
          <Route path="/ask" element={<Layout><AskNexusView /></Layout>} />
          <Route path="/decisions" element={<Layout><DecisionExplorerView /></Layout>} />
          <Route path="/briefing" element={<Layout><BriefingView /></Layout>} />
          <Route path="/immune" element={<Layout><ImmuneScanView /></Layout>} />
          <Route path="/people" element={<Layout><PeopleView /></Layout>} />
          <Route path="/tasks" element={<Layout><TaskGraphView /></Layout>} />
          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
      </div>
    </div>
  )
}
