* SPSS SYNTAX для анализа данных исследования.
* Идентификация эмоций у младших школьников с ЗПР.

* =============================================================================.
* ВВОД ДАННЫХ.
* =============================================================================.

DATA LIST FREE / ID Group Express UnderstandSelf UnderstandOthers Friends
  RE V UOZ EO FEN
  Mama Father Siblings Family Peers School People Abilities Negative Dreams Illness
  BSS Anxiety Conflict Inferiority Hostility
  LichPlus LichMinus PoznPlus PoznMinus LichStatus PoznStatus TotalStatus
  EmoLica.

BEGIN DATA
1 1 1 2 2 1 10 11 10 10 8 2 1 2 2 1 2 0 1 -1.5 2 -1.5 1 1 2 1 1 4 2 3 1 2 2 2.0 15
2 1 1 1 1 1 11 12 11 10 9 1 2 0 1 2 1 1 0 -2 1 -1.5 1 0 2 1 0 3 3 2 1 0 1 0.5 16
3 1 0 1 1 1 10 11 10 9 8 2 2 1 2 1 0 -1 2 -1 2 -2 1 1 1 0 0 5 1 3 0 4 3 3.5 14
4 1 1 1 1 1 9 10 10 9 7 1 0 -1 1 2 1 1 1 -1.5 1 -1.5 1 1 1 1 0 2 4 1 2 -2 -1 -1.5 15
5 1 1 1 1 2 12 12 12 11 9 2 1 2 2 0 2 0 2 -2 2 -1 0 1 1 1 0 4 2 3 0 2 3 2.5 17
6 1 0 1 0 0 10 11 10 10 9 0 2 1 1 1 2 1 1 -1.5 1 -2 0 2 2 0 1 3 3 2 1 0 1 0.5 14
7 1 1 1 0 0 11 11 11 10 8 1 1 0 1 2 0 0 1 -2 2 -1.5 1 1 1 0 0 1 5 1 2 -4 -1 -2.5 15
8 1 1 1 1 1 10 11 11 10 8 2 2 1 2 1 1 1 2 -1 1 -2 1 0 2 0 0 5 1 3 0 4 3 3.5 15
9 1 2 2 1 1 10 11 10 10 8 1 0 2 1 2 1 -1 1 -1.5 2 -1.5 1 1 1 1 1 4 2 2 1 2 1 1.5 14
10 1 0 1 1 1 11 12 11 11 9 2 1 0 2 1 2 0 0 -1 1 -2 1 1 2 1 1 3 3 3 0 0 3 1.5 15
11 1 2 1 2 2 10 12 10 10 8 2 2 1 1 0 1 1 1 -2 2 -1.5 1 2 1 1 1 5 1 2 1 4 1 2.5 16
12 1 1 2 1 2 11 11 11 10 8 2 1 2 2 1 0 0 2 -1.5 2 -1 1 1 2 0 1 2 4 2 2 -2 0 -1.0 14
13 1 1 1 1 1 10 11 11 10 9 1 1 0 1 2 1 1 0 -2 1 -1.5 1 1 1 1 0 4 2 3 0 2 3 2.5 15
14 1 1 0 0 1 9 11 10 9 8 1 0 1 0 1 2 -1 1 -1 1 -2 1 0 1 0 1 3 3 2 1 0 1 0.5 14
15 1 2 1 1 1 10 11 10 9 9 1 2 -1 1 2 1 0 1 -1.5 2 -1.5 1 1 1 0 1 5 1 3 0 4 3 3.5 15
16 1 1 0 1 2 11 12 11 11 8 2 1 2 2 0 1 1 2 -1 1 -1 0 1 1 0 1 2 4 2 2 -2 0 -1.0 15
17 1 1 1 1 1 10 11 10 10 8 1 2 0 1 1 2 0 0 -2 2 -1.5 1 2 1 1 0 4 2 3 0 2 3 2.5 14
18 1 1 0 0 0 10 11 10 10 8 2 0 1 2 2 0 1 1 -1 1 -2 1 1 1 0 1 3 2 2 1 1 1 1.0 15
19 1 1 1 1 2 11 12 11 10 8 0 1 2 1 1 1 -1 2 -1.5 2 -1.5 1 1 1 1 0 5 1 3 0 4 3 3.5 14
20 1 1 1 1 2 10 11 10 10 9 2 2 0 2 2 2 0 1 -1 2 -1 1 0 2 0 1 2 4 1 2 -2 -1 -1.5 15
21 1 1 1 0 0 11 12 10 10 9 1 1 1 1 0 1 1 0 -2 2 -1.5 1 1 2 1 0 4 2 3 0 2 3 2.5 16
22 1 2 1 2 1 10 11 10 10 9 2 2 2 2 1 0 0 1 -1.5 2 -2 1 1 1 0 1 3 3 2 1 0 1 0.5 14
23 1 1 0 0 1 10 11 10 10 8 1 0 -1 1 2 1 1 2 -2 1 -1.5 1 1 1 1 0 1 5 1 2 -4 -1 -2.5 15
24 1 2 1 2 1 11 12 11 11 8 2 1 1 2 1 2 -1 1 -1 1 -2 1 2 2 0 0 5 1 3 0 4 3 3.5 15
25 1 2 2 1 1 10 11 11 10 8 1 2 0 1 2 1 0 0 -1.5 1 -1.5 0 1 2 1 0 4 2 2 1 2 1 1.5 14
26 2 1 1 1 0 10 7 10 10 9 1 0 1 1 0 0 0 0 -1.5 1 0 0 2 2 0 1 1 4 2 1 -3 1 -1.0 11
27 2 2 2 1 0 10 6 10 10 8 2 -1 1 0 1 1 0 -1 -2 2 0.5 1 3 2 1 0 1 4 1 2 -3 -1 -2.0 10
28 2 1 1 2 2 10 7 10 10 8 1 0 0 1 -1 1 -1 0 -2 1 0 1 3 2 1 1 2 3 3 1 -1 2 0.5 12
29 2 1 1 1 2 10 8 10 10 8 2 -1 -1 0 0 0 1 -1 -1.5 2 -0.5 1 2 2 1 0 3 5 2 2 -2 0 -1.0 11
30 2 1 1 2 2 11 7 11 9 8 0 0 1 1 0 1 -1 0 -2 1 0 0 2 1 0 1 3 5 2 1 -2 1 -0.5 13
31 2 0 0 0 1 11 7 11 10 9 1 -1 0 0 -1 1 0 -1 -1.5 2 0 0 2 2 0 1 1 5 1 2 -4 -1 -2.5 10
32 2 0 1 0 0 10 6 10 9 9 2 0 -1 1 0 1 -1 0 -1 1 0.5 0 2 1 0 1 1 4 2 1 -3 1 -1.0 9
33 2 0 0 1 1 10 7 10 10 8 1 -1 1 0 -1 0 -1 -1 -1 2 -0.5 0 3 1 0 0 2 5 1 2 -3 -1 -2.0 11
34 2 2 1 2 2 11 8 10 10 8 2 0 1 1 0 0 -1 0 -1.5 1 0 0 2 1 0 1 3 4 2 1 -1 1 0.0 12
35 2 1 1 0 1 10 7 10 9 8 0 -1 0 1 -1 1 0 -1 -2 2 0 0 2 2 0 0 2 3 3 0 -1 3 1.0 10
36 2 1 1 1 1 10 6 10 9 8 1 0 -1 0 0 0 0 0 -1.5 1 0 0 3 2 1 1 1 5 1 2 -4 -1 -2.5 10
37 2 1 1 0 1 10 7 10 9 8 2 -1 1 0 -1 0 0 -1 -2 2 0.5 0 3 1 1 0 3 3 2 1 0 1 0.5 11
38 2 1 1 2 1 11 7 11 10 9 1 0 0 1 0 1 -1 0 -1 1 -0.5 0 3 1 0 1 2 4 2 1 -2 1 -0.5 11
39 2 1 1 2 1 10 8 10 10 8 2 -1 1 0 -1 0 0 1 -1.5 2 0 1 3 1 1 1 4 2 3 0 2 3 2.5 13
40 2 0 1 1 2 11 7 11 10 8 0 0 -1 1 0 1 -1 -1 -2 1 0 0 2 2 1 1 3 5 1 2 -2 -1 -1.5 10
41 2 1 1 1 2 11 8 11 10 9 1 -1 -1 1 -1 1 0 0 -1.5 2 0.5 0 2 1 1 0 1 3 2 1 -2 1 -0.5 11
42 2 1 1 1 1 10 7 10 10 8 2 -1 0 1 0 1 -1 -1 -2 1 -0.5 0 2 2 0 0 1 4 1 2 -3 -1 -2.0 10
43 2 2 2 1 1 10 8 10 10 8 1 0 1 0 -1 0 0 -1 -1.5 2 0 0 2 2 0 1 2 5 3 0 -3 3 0.0 11
44 2 1 1 1 1 11 7 11 10 8 2 0 1 0 -1 0 -1 0 -2 1 0 1 2 1 1 0 3 3 2 1 0 1 0.5 11
45 2 1 1 1 0 11 8 10 10 8 0 -1 1 0 0 0 0 0 -1.5 2 -0.5 0 2 2 0 0 4 2 2 1 2 1 1.5 10
46 2 2 1 0 0 10 7 10 10 9 1 -1 0 1 0 1 -1 -1 -2 1 0.5 0 2 2 1 0 1 5 1 2 -4 -1 -2.5 9
47 2 1 2 1 1 10 7 10 10 8 2 -1 1 0 -1 1 0 0 -1.5 2 0.5 0 2 1 0 0 3 3 2 1 0 1 0.5 11
48 2 2 2 1 1 10 8 10 10 8 1 0 -1 1 0 1 -1 0 -2 1 0 0 2 1 0 0 2 5 1 2 -3 -1 -2.0 10
49 2 0 1 0 0 10 6 11 9 8 2 0 1 0 -1 0 0 0 -1.5 2 0 0 2 1 0 0 1 3 3 0 -2 3 0.5 9
50 2 2 1 2 1 10 7 10 10 8 0 0 0 1 0 1 -1 -1 -2 1 -0.5 0 2 2 1 1 3 4 2 1 -1 1 0.0 10
END DATA.

VARIABLE LABELS
  ID 'Номер испытуемого'
  Group 'Группа (1=Норма, 2=ЗПР)'
  Express 'Умение выражать эмоции'
  UnderstandSelf 'Понимание себя'
  UnderstandOthers 'Понимание других'
  Friends 'Наличие друзей'
  RE 'Представления об эмоциях'
  V 'Вербализация эмоций'
  UOZ 'Уровень опосред. запоминания'
  EO 'Эмоциональный опыт'
  FEN 'Фактор эмоц. напряженности'
  Mama 'Отношение к маме'
  Father 'Отношение к отцу'
  Siblings 'Отношение к сиблингам'
  Family 'Отношение к семье'
  Peers 'Отношение к ровесникам'
  School 'Отношение к школе'
  People 'Отношение к людям'
  Abilities 'Отношение к способностям'
  Negative 'Негативные переживания'
  Dreams 'Мечты и планы'
  Illness 'Отношение к болезни'
  BSS 'Благоприятная сем. ситуация'
  Anxiety 'Тревожность'
  Conflict 'Конфликтность'
  Inferiority 'Чувство неполноценности'
  Hostility 'Враждебность'
  LichPlus 'Личностные выборы (+)'
  LichMinus 'Личностные выборы (-)'
  PoznPlus 'Познавательные выборы (+)'
  PoznMinus 'Познавательные выборы (-)'
  LichStatus 'Личностный статус'
  PoznStatus 'Познавательный статус'
  TotalStatus 'Общий статус'
  EmoLica 'Эмоциональные лица (прав. из 17)'.

VALUE LABELS Group 1 'Норма' 2 'ЗПР'.

* =============================================================================.
* ОПИСАТЕЛЬНАЯ СТАТИСТИКА.
* =============================================================================.

SORT CASES BY Group.
SPLIT FILE BY Group.

DESCRIPTIVES VARIABLES=Express UnderstandSelf UnderstandOthers Friends
  RE V UOZ EO FEN
  Mama Father Siblings Family Peers School People Abilities Negative Dreams Illness
  BSS Anxiety Conflict Inferiority Hostility
  LichPlus LichMinus PoznPlus PoznMinus LichStatus PoznStatus TotalStatus
  EmoLica
  /STATISTICS=MEAN STDDEV MIN MAX.

SPLIT FILE OFF.

* =============================================================================.
* КРИТЕРИЙ МАННА-УИТНИ (непараметрический).
* =============================================================================.

* Анкета педагогу.
NPAR TESTS
  /M-W= Express UnderstandSelf UnderstandOthers Friends BY Group(1 2)
  /STATISTICS=DESCRIPTIVES
  /MISSING ANALYSIS.

* Эмоциональная пиктограмма.
NPAR TESTS
  /M-W= RE V UOZ EO FEN BY Group(1 2)
  /STATISTICS=DESCRIPTIVES
  /MISSING ANALYSIS.

* Незаконченные предложения.
NPAR TESTS
  /M-W= Mama Father Siblings Family Peers School People Abilities Negative Dreams Illness BY Group(1 2)
  /STATISTICS=DESCRIPTIVES
  /MISSING ANALYSIS.

* КРС.
NPAR TESTS
  /M-W= BSS Anxiety Conflict Inferiority Hostility BY Group(1 2)
  /STATISTICS=DESCRIPTIVES
  /MISSING ANALYSIS.

* Социометрия.
NPAR TESTS
  /M-W= LichPlus LichMinus PoznPlus PoznMinus LichStatus PoznStatus TotalStatus BY Group(1 2)
  /STATISTICS=DESCRIPTIVES
  /MISSING ANALYSIS.

* Эмоциональные лица.
NPAR TESTS
  /M-W= EmoLica BY Group(1 2)
  /STATISTICS=DESCRIPTIVES
  /MISSING ANALYSIS.

* =============================================================================.
* КОРРЕЛЯЦИОННЫЙ АНАЛИЗ СПИРМЕНА.
* =============================================================================.

* Корреляции для группы ЗПР.
USE ALL.
COMPUTE filter_$=(Group=2).
FILTER BY filter_$.
NONPAR CORR
  /VARIABLES=EmoLica V UOZ Anxiety BSS LichStatus Peers
  /PRINT=SPEARMAN TWOTAIL NOSIG FULL
  /MISSING=PAIRWISE.
FILTER OFF.

* Корреляции для группы Нормы.
USE ALL.
COMPUTE filter_$=(Group=1).
FILTER BY filter_$.
NONPAR CORR
  /VARIABLES=EmoLica V UOZ Anxiety BSS LichStatus Peers
  /PRINT=SPEARMAN TWOTAIL NOSIG FULL
  /MISSING=PAIRWISE.
FILTER OFF.

* Общие корреляции (N=50).
USE ALL.
NONPAR CORR
  /VARIABLES=EmoLica V UOZ Anxiety BSS LichStatus Peers
  /PRINT=SPEARMAN TWOTAIL NOSIG FULL
  /MISSING=PAIRWISE.

* =============================================================================.
* ДОПОЛНИТЕЛЬНО: ПРОВЕРКА НОРМАЛЬНОСТИ РАСПРЕДЕЛЕНИЯ.
* =============================================================================.

EXAMINE VARIABLES=Express UnderstandSelf UnderstandOthers Friends
  RE V UOZ EO FEN
  BSS Anxiety Conflict Inferiority Hostility
  LichStatus PoznStatus TotalStatus
  EmoLica BY Group
  /PLOT BOXPLOT STEMLEAF NPPLOT
  /COMPARE GROUPS
  /STATISTICS DESCRIPTIVES
  /CINTERVAL 95
  /MISSING LISTWISE
  /NOTOTAL.
