// esbuild --loader:.html=text turns an imported .html file into its text (see server/finance/app-html.ts).
declare module '*.html' {
  const text: string;
  export default text;
}
