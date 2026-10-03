import React from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import Home from '../app/page';
import '../app/globals.css';
// Capacitor attaches the native bridge in packaged apps; browsers remain web clients.
void Capacitor.getPlatform();
createRoot(document.getElementById('root')!).render(<Home/>);
