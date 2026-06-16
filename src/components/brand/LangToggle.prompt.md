**HMR LangToggle** — the EN/فا switch that lives in the nav and flips the whole site between English and Persian (RTL).

```jsx
<LangToggle lang={lang} onChange={setLang} />
```

Props: `lang` (`'en'` | `'fa'`), `onChange(lang)`. The active side gets the neon gradient fill.
