/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Library } from './components/Library';
import { Chat } from './components/Chat';
import { Settings } from './components/Settings';
import { Citations } from './components/Citations';

export default function App() {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden font-sans text-zinc-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 h-full relative">
        {activeTab === 'library' && <Library />}
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'citations' && <Citations />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

