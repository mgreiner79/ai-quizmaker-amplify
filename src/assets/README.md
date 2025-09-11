# assets/

Static files imported by modules so the bundler can fingerprint/cache-bust.

## Contains

- Images (e.g., `coin.png`), audio (`correct.mp3`), fonts, SVGs.

## Usage

```ts
import coin from '@/assets/coin.png';
<img src={coin} alt="coin" />;
```
