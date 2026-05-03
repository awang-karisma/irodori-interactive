/// <reference types="vite/client" />

declare module 'virtual:icons/*' {
  const component: (props: { class?: string; [key: string]: any }) => any;
  export default component;
}