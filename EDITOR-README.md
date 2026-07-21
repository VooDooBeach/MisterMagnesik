# Edytor projektów magnesów — Mister Magnesik

Edytor działa w całości w przeglądarce i może być publikowany przez GitHub Pages. Zdjęcia pozostają lokalnie na urządzeniu do chwili świadomego wysłania zamówienia.

## Pliki

- `editor/index.html` — interfejs podstrony.
- `editor/editor.css` — wygląd desktopowy i mobilny.
- `editor/editor.js` — canvas, historia, zapis, eksport i formularz.
- `editor/config.js` — rozmiary, DPI, spad, margines, czcionki, ramki i limit pliku.
- `editor/integration.config.js` — sposób przekazywania zamówień.

## Najważniejsza konfiguracja

W `editor/config.js` można zmienić:

- `dpi` — domyślnie 300;
- `bleedMm` — spad w milimetrach;
- `safeMarginMm` — bezpieczny margines;
- `maxUploadMb` — limit przesłanego zdjęcia;
- `products` — kształty i rozmiary;
- `fonts`, `frames`, `decorations` — dostępne opcje edytora.

Rozmiary koła są oznaczone jako demonstracyjne. Należy je usunąć lub potwierdzić przed uruchomieniem sprzedaży, jeśli produkcja obejmuje wyłącznie cięcie gilotynowe.

## Zamówienia bez backendu

Domyślne ustawienie `mode: "demo"` w `editor/integration.config.js` powoduje pobranie dwóch plików:

1. PNG 300 DPI ze spadem;
2. JSON z danymi klienta i konfiguracją produktu.

Klient może przesłać oba pliki e-mailem lub przez formularz kontaktowy.

## Podłączenie własnego endpointu

1. Utwórz publiczny endpoint przyjmujący żądanie `POST` w Supabase Edge Functions, Firebase Functions albo na własnym serwerze.
2. Endpoint powinien odbierać JSON z danymi zamówienia i polem `projectPngDataUrl`.
3. W `editor/integration.config.js` ustaw:

```js
window.MAGNET_ORDER_INTEGRATION = {
  mode: "endpoint",
  endpointUrl: "https://twoj-publiczny-endpoint.example/order",
  publicAnonKey: "",
  headers: {}
};
```

4. Ogranicz CORS do domeny strony i zweryfikuj po stronie serwera typ, wielkość oraz treść żądania.
5. Sekretów, kluczy administratora i haseł nie wolno zapisywać w repozytorium GitHub Pages. Publiczny klucz anon Supabase lub Firebase musi mieć restrykcyjne reguły dostępu.

Przy większych plikach zalecany jest dwuetapowy przepływ: endpoint tworzy podpisany adres wysyłki, przeglądarka wysyła PNG bezpośrednio do storage, a następnie zapisuje zamówienie z adresem pliku.

## Uruchomienie lokalne

Uruchom prosty serwer HTTP w katalogu strony, a następnie otwórz `/editor/`. Nie otwieraj pliku tylko przez `file://`, ponieważ zachowanie zewnętrznej biblioteki i pobierania może różnić się od GitHub Pages.

## Publikacja

Po skopiowaniu plików do repozytorium:

1. wykonaj commit w GitHub Desktop;
2. wybierz `Push origin`;
3. poczekaj na publikację GitHub Pages;
4. otwórz `https://voodoobeach.github.io/MisterMagnesik/editor/`;
5. sprawdź dodawanie zdjęcia, tekstu, zapis po odświeżeniu i eksport PNG.

Ścieżki są względne, więc edytor działa również w podfolderze repozytorium GitHub Pages.

## Testy przed produkcją

- Chrome/Edge na komputerze;
- Safari iPhone;
- Chrome i Samsung Internet na Androidzie;
- szerokości 320, 360, 390 i 412 px;
- powiększenie tekstu 200%;
- nawigacja klawiaturą;
- zdjęcia pionowe i poziome;
- plik przekraczający limit;
- eksport wszystkich aktywnych rozmiarów;
- odświeżenie strony i przywrócenie projektu.
