import { QueryProvider } from './app/providers/QueryProvider'
import { AppRouter } from './app/router'

export default function App() {
  return (
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  )
}
