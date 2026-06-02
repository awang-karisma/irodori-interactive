import { Show, type Component } from 'solid-js'
import { useRegisterSW } from 'virtual:pwa-register/solid'

const ReloadPrompt: Component = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <Show when={offlineReady() || needRefresh()}>
      <div class="fixed right-0 bottom-0 m-4 p-3 border border-gray-300 rounded shadow-lg bg-white z-50 text-left">
        <div class="mb-2">
          <Show
            fallback={<span>New content available, click reload to update.</span>}
            when={offlineReady()}
          >
            <span>App ready to work offline</span>
          </Show>
        </div>
        <Show when={needRefresh()}>
          <button
            class="border border-gray-300 rounded px-3 py-1 mr-2 hover:bg-gray-100"
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </button>
        </Show>
        <button
          class="border border-gray-300 rounded px-3 py-1 hover:bg-gray-100"
          onClick={close}
        >
          Close
        </button>
      </div>
    </Show>
  )
}

export default ReloadPrompt
