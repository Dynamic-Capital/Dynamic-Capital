-- Seed baseline School of Pipsology curriculum data
with preschool as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'preschool',
    'Preschool',
    'Currency trading? Forex trading? FX trading? Totally clueless about forex? Here''s an introduction to the foreign exchange market.',
    1,
    'https://www.babypips.com/learn/forex/preschool'
  )
  returning id
), preschool_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select preschool.id, slug, title, seq, content_url
  from preschool,
  lateral (values
    ('what-is-forex', 'What is Forex?', 1, 'https://www.babypips.com/learn/forex/what-is-forex'),
    ('how-do-you-trade-forex', 'How Do You Trade Forex?', 2, 'https://www.babypips.com/learn/forex/how-do-you-trade-forex'),
    ('when-can-you-trade-forex', 'When Can You Trade Forex?', 3, 'https://www.babypips.com/learn/forex/when-can-you-trade-forex'),
    ('who-trades-forex', 'Who Trades Forex?', 4, 'https://www.babypips.com/learn/forex/who-trades-forex'),
    ('why-trade-forex', 'Why Trade Forex?', 5, 'https://www.babypips.com/learn/forex/why-trade-forex'),
    ('margin-trading-101', 'Margin Trading 101: Understand How Your Margin Account Works', 6, 'https://www.babypips.com/learn/forex/margin-trading-101')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), kindergarten as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'kindergarten',
    'Kindergarten',
    'Learn the basics on how to choose a forex broker and analyze the currency markets.',
    2,
    'https://www.babypips.com/learn/forex/kindergarten'
  )
  returning id
), kindergarten_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select kindergarten.id, slug, title, seq, content_url
  from kindergarten,
  lateral (values
    ('forex-brokers-101', 'Forex Brokers 101', 1, 'https://www.babypips.com/learn/forex/forex-brokers-101'),
    ('three-types-of-analysis', 'Three Types of Analysis', 2, 'https://www.babypips.com/learn/forex/three-types-of-analysis'),
    ('types-of-charts', 'Types of Charts', 3, 'https://www.babypips.com/learn/forex/types-of-charts')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), elementary as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'elementary',
    'Elementary',
    'The beginner''s guide to technical analysis.',
    3,
    'https://www.babypips.com/learn/forex/elementary'
  )
  returning id
), elementary_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select elementary.id, slug, title, seq, content_url
  from elementary,
  lateral (values
    ('support-and-resistance-levels', 'Grade 1 — Support and Resistance Levels', 1, 'https://www.babypips.com/learn/forex/support-and-resistance-levels'),
    ('japanese-candlesticks', 'Grade 2 — Japanese Candlesticks', 2, 'https://www.babypips.com/learn/forex/japanese-candlesticks'),
    ('fibonacci', 'Grade 3 — Fibonacci', 3, 'https://www.babypips.com/learn/forex/fibonacci'),
    ('moving-averages', 'Grade 4 — Moving Averages', 4, 'https://www.babypips.com/learn/forex/moving-averages'),
    ('popular-chart-indicators', 'Grade 5 — Popular Chart Indicators', 5, 'https://www.babypips.com/learn/forex/popular-chart-indicators')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), middle_school as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'middle-school',
    'Middle School',
    'Learn how to properly use chart indicators, spot chart patterns and use pivot points.',
    4,
    'https://www.babypips.com/learn/forex/middle-school'
  )
  returning id
), middle_school_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select middle_school.id, slug, title, seq, content_url
  from middle_school,
  lateral (values
    ('oscillators-and-momentum-indicators', 'Grade 6 — Oscillators and Momentum Indicators', 1, 'https://www.babypips.com/learn/forex/oscillators-and-momentum-indicators'),
    ('important-chart-patterns', 'Grade 7 — Important Chart Patterns', 2, 'https://www.babypips.com/learn/forex/important-chart-patterns'),
    ('pivot-points', 'Grade 8 — Pivot Points', 3, 'https://www.babypips.com/learn/forex/pivot-points')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), summer_school as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'summer-school',
    'Summer School',
    'Take your technical analysis and chart reading skills to another level by learning Heikin Ashi, Elliott Wave Theory and harmonic price patterns.',
    5,
    'https://www.babypips.com/learn/forex/summer-school'
  )
  returning id
), summer_school_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select summer_school.id, slug, title, seq, content_url
  from summer_school,
  lateral (values
    ('heikin-ashi', 'Heikin Ashi', 1, 'https://www.babypips.com/learn/forex/heikin-ashi'),
    ('elliott-wave-theory', 'Elliott Wave Theory', 2, 'https://www.babypips.com/learn/forex/elliott-wave-theory'),
    ('harmonic-price-patterns', 'Harmonic Price Patterns', 3, 'https://www.babypips.com/learn/forex/harmonic-price-patterns')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), high_school as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'high-school',
    'High School',
    'Dig deeper into more technical analysis concepts like trading divergences, breakouts and using multiple time frames on your charts.',
    6,
    'https://www.babypips.com/learn/forex/high-school'
  )
  returning id
), high_school_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select high_school.id, slug, title, seq, content_url
  from high_school,
  lateral (values
    ('trading-divergences', 'Grade 9 — Trading Divergences', 1, 'https://www.babypips.com/learn/forex/trading-divergences'),
    ('market-environment', 'Grade 10 — Market Environment', 2, 'https://www.babypips.com/learn/forex/market-environment'),
    ('trading-breakouts-and-fakeouts', 'Grade 11 — Trading Breakouts and Fakeouts', 3, 'https://www.babypips.com/learn/forex/trading-breakouts-and-fakeouts'),
    ('fundamental-analysis', 'Grade 12 — Fundamental Analysis', 4, 'https://www.babypips.com/learn/forex/fundamental-analysis'),
    ('currency-crosses', 'Grade 13 — Currency Crosses', 5, 'https://www.babypips.com/learn/forex/currency-crosses'),
    ('multiple-time-frame-analysis', 'Grade 14 — Multiple Time Frame Analysis', 6, 'https://www.babypips.com/learn/forex/multiple-time-frame-analysis')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), undergraduate_freshman as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'undergraduate-freshman',
    'Undergraduate - Freshman',
    'Learn how to gauge whether the market is bullish or bearish, how to trade during news releases and how to potentially make money without price moving.',
    7,
    'https://www.babypips.com/learn/forex/undergraduate-freshman'
  )
  returning id
), undergraduate_freshman_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select undergraduate_freshman.id, slug, title, seq, content_url
  from undergraduate_freshman,
  lateral (values
    ('market-sentiment', 'Market Sentiment', 1, 'https://www.babypips.com/learn/forex/market-sentiment'),
    ('trading-the-news', 'Trading the News', 2, 'https://www.babypips.com/learn/forex/trading-the-news'),
    ('carry-trade', 'Carry Trade', 3, 'https://www.babypips.com/learn/forex/carry-trade')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), undergraduate_sophomore as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'undergraduate-sophomore',
    'Undergraduate - Sophomore',
    'Learn how other asset classes like stocks, bonds and commodities can affect the foreign exchange market.',
    8,
    'https://www.babypips.com/learn/forex/undergraduate-sophomore'
  )
  returning id
), undergraduate_sophomore_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select undergraduate_sophomore.id, slug, title, seq, content_url
  from undergraduate_sophomore,
  lateral (values
    ('the-us-dollar-index', 'The U.S. Dollar Index', 1, 'https://www.babypips.com/learn/forex/the-us-dollar-index'),
    ('intermarket-correlations', 'Intermarket Correlations', 2, 'https://www.babypips.com/learn/forex/intermarket-correlations'),
    ('using-equities-to-trade-fx', 'Using Equities to Trade FX', 3, 'https://www.babypips.com/learn/forex/using-equities-to-trade-fx'),
    ('country-profiles', 'Country Profiles', 4, 'https://www.babypips.com/learn/forex/country-profiles')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), undergraduate_junior as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'undergraduate-junior',
    'Undergraduate - Junior',
    'Learn how to develop a trading plan, create a trading system and maintain a trading journal.',
    9,
    'https://www.babypips.com/learn/forex/undergraduate-junior'
  )
  returning id
), undergraduate_junior_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select undergraduate_junior.id, slug, title, seq, content_url
  from undergraduate_junior,
  lateral (values
    ('developing-your-own-trading-plan', 'Developing Your Own Trading Plan', 1, 'https://www.babypips.com/learn/forex/developing-your-own-trading-plan'),
    ('which-type-of-trader-are-you', 'Which Type of Trader Are You?', 2, 'https://www.babypips.com/learn/forex/which-type-of-trader-are-you'),
    ('create-your-own-trading-system', 'Create Your Own Trading System', 3, 'https://www.babypips.com/learn/forex/create-your-own-trading-system'),
    ('keeping-a-trading-journal', 'Keeping a Trading Journal', 4, 'https://www.babypips.com/learn/forex/keeping-a-trading-journal'),
    ('how-to-use-metatrader-4', 'How to Use MetaTrader 4', 5, 'https://www.babypips.com/learn/forex/how-to-use-metatrader-4')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), undergraduate_senior as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'undergraduate-senior',
    'Undergraduate - Senior',
    'Develop the proper risk management skills and mindset so you don''t become part of the 95% of new traders who end up losing all their money.',
    10,
    'https://www.babypips.com/learn/forex/undergraduate-senior'
  )
  returning id
), undergraduate_senior_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select undergraduate_senior.id, slug, title, seq, content_url
  from undergraduate_senior,
  lateral (values
    ('risk-management', 'Risk Management', 1, 'https://www.babypips.com/learn/forex/risk-management'),
    ('number-one-cause-of-death-forex-traders', 'The Number 1 Cause of Death of Forex Traders', 2, 'https://www.babypips.com/learn/forex/number-one-cause-of-death-forex-traders'),
    ('position-sizing', 'Position Sizing', 3, 'https://www.babypips.com/learn/forex/position-sizing'),
    ('setting-stop-losses', 'Setting Stop Losses', 4, 'https://www.babypips.com/learn/forex/setting-stop-losses'),
    ('scaling-in-and-out', 'Scaling In and Out', 5, 'https://www.babypips.com/learn/forex/scaling-in-and-out'),
    ('currency-correlations', 'Currency Correlations', 6, 'https://www.babypips.com/learn/forex/currency-correlations')
  ) as lessons(slug, title, seq, content_url)
  returning 1
), graduation as (
  insert into public.school_courses (slug, title, summary, sequence, start_url)
  values (
    'graduation',
    'Graduation',
    'Some final words of wisdom before you venture out into the challenging world of trading forex.',
    11,
    'https://www.babypips.com/learn/forex/graduation'
  )
  returning id
), graduation_lessons as (
  insert into public.school_lessons (course_id, slug, title, sequence, content_url)
  select graduation.id, slug, title, seq, content_url
  from graduation,
  lateral (values
    ('common-trading-mistakes', 'The Most Common Trading Mistakes New Traders Make', 1, 'https://www.babypips.com/learn/forex/common-trading-mistakes'),
    ('forex-trading-scams', 'Forex Trading Scams', 2, 'https://www.babypips.com/learn/forex/forex-trading-scams'),
    ('personality-quizzes', 'Personality Quizzes', 3, 'https://www.babypips.com/learn/forex/personality-quizzes'),
    ('graduation-speech', 'Graduation Speech', 4, 'https://www.babypips.com/learn/forex/graduation-speech')
  ) as lessons(slug, title, seq, content_url)
  returning 1
select 1;
