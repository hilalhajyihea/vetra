# Vetra

פלטפורמת SaaS לווטרינרים ולמגדלים — מעקב חיסונים, קבוצות חיות והמלטות. כל וטרינר מקבל כתובת ייחודית.

## הרצה מקומית

1. צרו קובץ `.env` לפי `.env.example`
2. התקינו PostgreSQL וצרו מסד `vetra`
3. הריצו:

```bash
npm install
npm run db:setup
npm run dev
```

פתחו [http://localhost:3000](http://localhost:3000)

- דף בית: `/` (עברית / ערבית)
- מנהל מערכת: `/platform/login`

## פריסה ל-Render + GitHub

1. ריפו GitHub חדש (לא אותו ריפו של ספר בקליק / מגרש בקליק)
2. Web Service `vetra` + PostgreSQL נפרד
3. משתנים: `DATABASE_URL`, `AUTH_SECRET`, `PLATFORM_PASSWORD`

### משתני סביבה

| משתנה | הסבר |
|--------|------|
| `DATABASE_URL` | חובה |
| `AUTH_SECRET` | סוד סשן |
| `PLATFORM_USERNAME` / `PLATFORM_PASSWORD` | מנהל מערכת |
