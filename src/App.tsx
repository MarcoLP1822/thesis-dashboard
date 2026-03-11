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
        <div className={activeTab === 'library' ? 'h-full' : 'hidden'}><Library /></div>
        <div className={activeTab === 'chat' ? 'h-full' : 'hidden'}><Chat /></div>
        <div className={activeTab === 'citations' ? 'h-full' : 'hidden'}><Citations /></div>
        <div className={activeTab === 'settings' ? 'h-full' : 'hidden'}><Settings /></div>
      </main>
    </div>
  );
}

