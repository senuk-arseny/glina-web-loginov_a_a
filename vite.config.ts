import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // По умолчанию `vitest run` сворачивает вывод до счётчиков —
    // verbose показывает имя и результат каждого теста, включая describe-группы.
    reporters: ['verbose'],
  },
})
