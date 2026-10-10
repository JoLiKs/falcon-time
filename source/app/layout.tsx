import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Falcon Time — время команды',description:'Учёт времени в проектах ChatGPT. Команда, сессии и отчёты.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Falcon Time'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#101313'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body><script dangerouslySetInnerHTML={{__html:"try{if(JSON.parse(localStorage.getItem('falcon-time-workspace')||'{}').theme==='light')document.documentElement.dataset.theme='light'}catch(e){}"}}/>{children}</body></html>;}
