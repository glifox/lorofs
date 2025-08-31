import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      outputDir: 'dist/types',
      insertTypesEntry: true,
    })
  ],
  build: {
    lib: {
      entry: 'exports.ts',
      name: 'lorofs',
      fileName: 'lorofs',
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      external: [
        "loro-crdt",
        "uuid"
      ],
      output: {
        globals: {
          lorofs: 'lorofs',
          "loro-crdt": 'loroCrdt',
          "uuid": 'uuid'
        }
      }
    }
  },
});