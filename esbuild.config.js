import { build } from 'esbuild'

await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'lib/index.cjs',
    format: 'cjs',
    platform: 'node',
    external: [
        'koishi',
        '@koishijs/plugin-console',
        '@koishijs/client'
    ]
})
