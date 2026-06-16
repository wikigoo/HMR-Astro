**HMR ChatComposer** — the pill-shaped glass input at the bottom of the chat, with a circular neon send button. Controlled.

```jsx
<ChatComposer value={text} onChange={setText} onSend={send} />
```

Props: `value`, `onChange(value)`, `onSend()`, `placeholder`, `rtl`. Enter key sends.
