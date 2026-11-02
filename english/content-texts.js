'use strict';
/* Eingebaute Lesetexte (B1–B2). Funktionieren ohne KI. Später kommen KI-Texte dazu. */
window.TEXTS = [
{ id:'t01', title:'The 5 a.m. Club Myth', topic:'Discipline', text:
`For years, social media has told us that successful people get up at 5 a.m. The idea sounds attractive: while the rest of the world is asleep, you get a head start on your goals. But sleep researchers are not convinced. What really matters, they say, is not the exact time you wake up but whether you get enough sleep on a regular schedule.

If you go to bed at 10 p.m., getting up at 5 is perfectly reasonable. If you go to bed at midnight, an early alarm simply means you are cutting corners on sleep, and that will catch up with you sooner or later. Your concentration drops, you crave sugar, and your mood suffers.

The real secret of early risers is consistency. They protect their evenings, put their phones away and treat sleep as part of their training, not as wasted time. In other words, the morning starts the night before.`,
phrases:[{term:'get a head start',meaning_de:'einen Vorsprung bekommen',explanation_en:'to start earlier than others and so have an advantage'},{term:'cutting corners',meaning_de:'an etwas sparen / pfuschen',explanation_en:'doing something less well to save time or effort'},{term:'catch up with you',meaning_de:'dich einholen (negative Folgen)',explanation_en:'when the bad results of something finally affect you'},{term:'crave',meaning_de:'ein starkes Verlangen haben nach',explanation_en:'to want something very strongly'},{term:'consistency',meaning_de:'Beständigkeit, Regelmäßigkeit',explanation_en:'doing something the same way again and again'}],
questions:[{type:'meaning',q:'What does "cutting corners on sleep" mean in the text? Explain in your own words.',hint_de:'Was macht man, wenn man „an der Ecke abschneidet“?',model:'It means you sleep less than you need because you want to save time, so you do not do it properly.'},
{type:'meaning',q:'Why do the researchers say that "the morning starts the night before"?',hint_de:'Was passiert am Abend?',model:'Because a good morning depends on going to bed on time and preparing the evening, for example putting the phone away.'},
{type:'opinion',q:'Your rule is to sleep from 22:00 to 5:00. What helps you most to keep it – and what makes it hard?',hint_de:'Erzähl ehrlich von deinem Abend.',model:'What helps me most is putting my phone away at 21:30. What makes it hard is when friends message me late.'}]},

{ id:'t02', title:'Why Your Brain Loves Unfinished Tasks', topic:'Psychology', text:
`Have you ever noticed that you remember an unfinished task much better than a finished one? Psychologists call this the Zeigarnik effect, named after Bluma Zeigarnik, who observed in the 1920s that waiters in a Berlin café remembered open orders in great detail but forgot them as soon as the bill was paid.

Our brain keeps unfinished tasks "on the table", which can be stressful. That is why a long to-do list can make you feel anxious even when you are relaxing. However, you can also use the effect to your advantage. If you struggle to start studying, just begin with five minutes. Once a task is started, your brain wants to finish it, and the hardest part – getting going – is already behind you.

Another tip: before you stop working for the day, write down the very next step. Your mind will let go of the task, and tomorrow you will know exactly where to pick up.`,
phrases:[{term:'to your advantage',meaning_de:'zu deinem Vorteil',explanation_en:'in a way that helps you'},{term:'struggle to',meaning_de:'Mühe haben, etwas zu tun',explanation_en:'to find something difficult'},{term:'getting going',meaning_de:'in Gang kommen, anfangen',explanation_en:'starting to do something'},{term:'let go of',meaning_de:'loslassen',explanation_en:'to stop holding or thinking about something'},{term:'pick up',meaning_de:'weitermachen, wieder aufnehmen',explanation_en:'to continue from the point where you stopped'}],
questions:[{type:'meaning',q:'Explain the Zeigarnik effect in one or two sentences, without copying the text.',hint_de:'Was merkt sich das Gehirn besser?',model:'Our brain remembers tasks that we have not finished better than tasks that are done, because it keeps thinking about them.'},
{type:'meaning',q:'What does "pick up" mean in the last sentence?',hint_de:'Nicht „aufheben“ wie einen Gegenstand.',model:'It means to continue your work from the point where you stopped the day before.'},
{type:'opinion',q:'Which task have you been putting off? How could the "five-minute trick" help you?',hint_de:'Beschreibe eine echte Aufgabe.',model:'I have been putting off my tax return. I could start with only five minutes and collect the documents.'}]},

{ id:'t03', title:'Cold Showers: Hype or Help?', topic:'Health', text:
`Cold showers have become a symbol of mental toughness. Influencers swear by them, claiming they boost energy, burn fat and make you more resilient. So what does the science say?

Some benefits are real. A short cold shower makes your heart beat faster and releases noradrenaline, which can leave you feeling more alert and in a better mood for a while. Studies from the Netherlands also found that people who finished their shower with 30 to 90 seconds of cold water took slightly fewer sick days.

But many claims are exaggerated. The effect on fat loss is tiny, and if you have heart problems, sudden cold exposure can even be dangerous. Perhaps the biggest benefit is psychological: every morning you do something uncomfortable on purpose. That small victory can set the tone for the rest of your day. Just don't expect a miracle – sleep, exercise and food still do most of the work.`,
phrases:[{term:'swear by',meaning_de:'auf etwas schwören',explanation_en:'to strongly believe that something works'},{term:'resilient',meaning_de:'widerstandsfähig, belastbar',explanation_en:'able to recover quickly from difficult situations'},{term:'exaggerated',meaning_de:'übertrieben',explanation_en:'described as bigger or better than it really is'},{term:'on purpose',meaning_de:'absichtlich',explanation_en:'not by accident; because you want to'},{term:'set the tone',meaning_de:'den Ton angeben, die Richtung vorgeben',explanation_en:'to establish the mood for what follows'}],
questions:[{type:'meaning',q:'What does "set the tone for the rest of your day" mean?',hint_de:'Ton = Stimmung.',model:'It means that the first thing you do in the morning influences your mood and attitude for the whole day.'},
{type:'meaning',q:'Which claims about cold showers are exaggerated, according to the text?',hint_de:'Zweiter Absatz vs. dritter Absatz.',model:'The claim that cold showers help you lose a lot of fat is exaggerated – the effect is very small.'},
{type:'opinion',q:'Would you try (or do you already do) cold showers? Why or why not?',hint_de:'Begründe mit einem Argument aus dem Text.',model:'I already do it after training because it wakes me up, but I do not think it is a miracle.'}]},

{ id:'t04', title:'The Hidden Cost of "Just Checking"', topic:'Digital life', text:
`Most people don't think they use their phone too much. They are "just checking" – a message here, a quick look at the news there. But researchers estimate that the average person picks up their phone more than 90 times a day. Each check only takes a few seconds, yet the damage adds up.

The problem is not the time itself but the interruption. After a distraction, it can take several minutes to get back into deep focus. If you check your phone every ten minutes while studying, you may never reach that state at all. You feel busy, but you are only scratching the surface.

Some people now keep their phone in another room while they work. Others turn their screen grey, which makes apps far less tempting. The point is not to give up technology altogether, but to decide when you use it – instead of letting it decide for you.`,
phrases:[{term:'adds up',meaning_de:'summiert sich',explanation_en:'small amounts become a large total'},{term:'deep focus',meaning_de:'tiefe Konzentration',explanation_en:'a state where you concentrate completely on one thing'},{term:'scratching the surface',meaning_de:'nur an der Oberfläche kratzen',explanation_en:'dealing with only a small, shallow part of something'},{term:'tempting',meaning_de:'verlockend',explanation_en:'making you want to do or have something'},{term:'altogether',meaning_de:'ganz und gar, völlig',explanation_en:'completely'}],
questions:[{type:'meaning',q:'In your own words: why is "just checking" a problem, even if it only takes seconds?',hint_de:'Es geht nicht um die Zeit selbst.',model:'Because every check interrupts your concentration and you need several minutes to focus deeply again.'},
{type:'meaning',q:'What does "only scratching the surface" mean here?',hint_de:'Oberfläche vs. Tiefe.',model:'It means you only do shallow work and never really go deep into the topic.'},
{type:'opinion',q:'What rules do you use (or want to use) to control your phone instead of letting it control you?',hint_de:'Denk an dein 2-Stunden-Limit.',model:'I want to keep my phone in the kitchen while I study and use it only after I have finished.'}]},

{ id:'t05', title:'How Footballers Train Their Minds', topic:'Sport', text:
`When we watch professional football, we mostly see physical skills: speed, strength, technique. What we don't see is how much time top players spend training their minds. Many clubs now employ sports psychologists, and visualisation has become a standard tool.

Before a match, a player might close their eyes and imagine specific situations in vivid detail – receiving the ball under pressure, taking a penalty in front of a hostile crowd. The brain partly reacts as if these situations were real, so when they actually happen, they feel familiar rather than frightening.

Another key skill is dealing with mistakes. A defender who keeps thinking about an error is likely to make the next one. That's why players are taught short "reset routines", such as clapping their hands or taking one deep breath, to leave the mistake behind and focus on the next action. It's a lesson that works far beyond the pitch.`,
phrases:[{term:'in vivid detail',meaning_de:'lebhaft, sehr detailliert',explanation_en:'very clearly, as if it were real'},{term:'under pressure',meaning_de:'unter Druck',explanation_en:'in a stressful situation with little time'},{term:'hostile',meaning_de:'feindselig',explanation_en:'unfriendly and aggressive'},{term:'is likely to',meaning_de:'wird wahrscheinlich',explanation_en:'will probably'},{term:'far beyond the pitch',meaning_de:'weit über den Fußballplatz hinaus',explanation_en:'also in other areas of life, not only in football'}],
questions:[{type:'meaning',q:'Why does visualisation help players, according to the text?',hint_de:'Wie reagiert das Gehirn?',model:'Because the brain reacts partly as if the situation were real, so later it feels familiar and less scary.'},
{type:'meaning',q:'Explain what a "reset routine" is and why players use it.',hint_de:'Beispiele stehen im Text.',model:'It is a short action, like clapping or breathing deeply, that helps a player forget a mistake and concentrate on the next action.'},
{type:'opinion',q:'Describe a situation in your life where a "reset routine" could help you.',hint_de:'Arbeit, Training, Prüfung …',model:'When I get a bad mark in an exam, I could take a short walk and then start again with a clear head.'}]},

{ id:'t06', title:'Learning a Language Like an Adult', topic:'Learning', text:
`People often say that children learn languages effortlessly while adults struggle. It's true that children usually end up with a better accent. But in many other ways, adults have a clear advantage: they can read, they understand grammar rules, and they can choose exactly what they want to learn.

The real difference is exposure. A child hears its first language for thousands of hours before it says a full sentence. Adults, on the other hand, often expect results after a few weeks of an app. Unsurprisingly, they get frustrated.

Research suggests that adults learn best when they combine two things: lots of interesting input – books, series, podcasts – and active output with feedback. Writing a short text and having someone correct it, or speaking and noticing which words you are missing, forces your brain to fill the gaps. Fifteen focused minutes a day, done consistently, beat a three-hour session once a month.`,
phrases:[{term:'effortlessly',meaning_de:'mühelos',explanation_en:'without needing much effort'},{term:'end up with',meaning_de:'am Ende haben / landen bei',explanation_en:'to finally have something as a result'},{term:'exposure',meaning_de:'Kontakt, Ausgesetztsein (hier: mit der Sprache)',explanation_en:'the amount of contact you have with something'},{term:'unsurprisingly',meaning_de:'wenig überraschend',explanation_en:'as you would expect'},{term:'fill the gaps',meaning_de:'Lücken füllen',explanation_en:'to add what is missing'}],
questions:[{type:'meaning',q:'What is "exposure" in this text? Explain with your own example.',hint_de:'Wie viel Kontakt hat ein Kind mit seiner Sprache?',model:'Exposure means how much you hear or read a language. For example, watching series in English every evening gives you a lot of exposure.'},
{type:'meaning',q:'According to the text, what two things should adults combine?',hint_de:'Input und …',model:'They should combine a lot of interesting input, like books or podcasts, with active output such as writing or speaking that gets corrected.'},
{type:'opinion',q:'Where could you get more English "input" in your daily life?',hint_de:'Sei konkret: welche Serie, welcher Podcast?',model:'I could listen to an English podcast during training and switch my phone language to English.'}]},

{ id:'t07', title:'The Two-Minute Rule', topic:'Productivity', text:
`Procrastination is rarely about laziness. More often, a task feels too big, so we avoid it. One simple strategy to beat this is the two-minute rule, popularised by the writer James Clear.

The idea is to scale down any new habit until it takes less than two minutes. "Read every evening" becomes "read one page". "Go running" becomes "put on your running shoes". It sounds almost ridiculous, but there is a reason it works: the hardest step is usually the first one. Once your shoes are on, going out for a run is much easier.

Critics argue that one page or a pair of shoes is not real progress. That misses the point. The goal in the first weeks is not performance but identity – becoming the kind of person who shows up every day. When the habit is established, you can gradually raise the bar. A habit must be established before it can be improved.`,
phrases:[{term:'procrastination',meaning_de:'Aufschieberitis, Prokrastination',explanation_en:'delaying things you should do'},{term:'scale down',meaning_de:'verkleinern, herunterfahren',explanation_en:'to make smaller'},{term:'misses the point',meaning_de:'am Thema vorbeigehen, nicht verstehen, worum es geht',explanation_en:'to not understand the most important part'},{term:'shows up',meaning_de:'erscheint, ist da',explanation_en:'to come or appear, to be present'},{term:'raise the bar',meaning_de:'die Messlatte höher legen',explanation_en:'to set a higher standard'}],
questions:[{type:'meaning',q:'What does "raise the bar" mean? Give an example from your own habits.',hint_de:'Messlatte beim Hochsprung.',model:'It means making your goal harder. For example, after reading one page for a month I could read ten pages a day.'},
{type:'meaning',q:'Why do critics say the rule is not real progress, and how does the text answer them?',hint_de:'Leistung vs. Identität.',model:'They say one page is too little, but the text says the goal at the start is to become someone who does the habit every day.'},
{type:'opinion',q:'Your habit is "read at least one page". Is the two-minute rule working for you? Explain.',hint_de:'Ehrlich sein!',model:'Yes, because one page is so easy that I never skip it, and usually I read more.'}]},

{ id:'t08', title:'Why We Should Be Bored More Often', topic:'Mindset', text:
`When was the last time you were really bored? For most of us, the answer is: we can't remember. The moment there is nothing to do – at a bus stop, in a queue – we reach for our phones.

That might sound harmless, but some psychologists believe we are losing something valuable. Boredom is uncomfortable, and that discomfort pushes the mind to wander. Mind-wandering is strongly linked to creativity, planning and reflecting on our own lives. In one well-known study, people who first did a boring task, like copying numbers from a phone book, came up with more creative ideas afterwards.

So next time you are waiting, try to resist the urge to scroll. Look around, let your thoughts drift and see where they take you. You might not solve all your problems, but you will give your brain the space it needs to make unexpected connections.`,
phrases:[{term:'reach for',meaning_de:'greifen nach',explanation_en:'to stretch your hand out to take something'},{term:'wander',meaning_de:'umherwandern, abschweifen',explanation_en:'to move around without a clear direction'},{term:'came up with',meaning_de:'sich ausdenken, auf etwas kommen',explanation_en:'to think of an idea'},{term:'resist the urge',meaning_de:'dem Drang widerstehen',explanation_en:'to not do something you strongly want to do'},{term:'drift',meaning_de:'treiben, abschweifen',explanation_en:'to move slowly without control'}],
questions:[{type:'meaning',q:'In your own words: why can boredom be useful?',hint_de:'Was macht der Kopf, wenn er sich langweilt?',model:'Because when we are bored our mind starts to wander, and that helps us to be creative and think about our life.'},
{type:'meaning',q:'What does "resist the urge to scroll" mean?',hint_de:'urge = Drang',model:'It means you do not take your phone even though you really want to look at social media.'},
{type:'opinion',q:'When did you last let your mind wander without your phone? What happened?',hint_de:'Kleine Situation reicht.',model:'Yesterday I walked home without music and I suddenly had an idea for my project.'}]},

{ id:'t09', title:'Remote Work: Freedom or Trap?', topic:'Work', text:
`When the pandemic forced millions of people to work from home, many discovered they liked it. No commute, more flexibility, fewer pointless meetings. Years later, the debate is still going on: should companies bring employees back to the office?

Supporters of remote work point to studies showing that people are just as productive at home, and often happier. Employers, on the other hand, worry that teamwork and company culture suffer when colleagues only meet on a screen. Younger employees in particular may miss out on learning from experienced colleagues by simply overhearing how they handle problems.

There is also a personal side. Without clear boundaries, home can turn into a place where you never really stop working. Many people now prefer a hybrid model: two or three days in the office for collaboration, the rest at home for focused work. As so often, the best solution seems to lie somewhere in between.`,
phrases:[{term:'commute',meaning_de:'Pendelweg, pendeln',explanation_en:'the journey to and from work'},{term:'pointless',meaning_de:'sinnlos',explanation_en:'having no purpose or use'},{term:'miss out on',meaning_de:'etwas verpassen',explanation_en:'to not get the chance to have or do something good'},{term:'overhearing',meaning_de:'zufällig mithören',explanation_en:'hearing something that was not said directly to you'},{term:'boundaries',meaning_de:'Grenzen',explanation_en:'limits that separate one thing from another'}],
questions:[{type:'meaning',q:'Why could younger employees "miss out" when they work only from home?',hint_de:'Was hört man im Büro nebenbei?',model:'Because they cannot hear how experienced colleagues solve problems, so they learn less.'},
{type:'meaning',q:'What are "clear boundaries" in the context of working from home?',hint_de:'Arbeit vs. Freizeit.',model:'They are rules that separate work time and free time, for example stopping work at 6 p.m.'},
{type:'opinion',q:'Would you prefer to work from home, in an office or hybrid? Give two reasons.',hint_de:'Zwei Gründe, mit "because" / "also".',model:'I would prefer hybrid, because I focus better at home but I also need contact with colleagues.'}]},

{ id:'t10', title:'The Science of Habit Stacking', topic:'Habits', text:
`Starting a new habit is hard because it needs a trigger – something that reminds you to do it. One clever solution is "habit stacking": you attach a new habit to one you already have.

The formula is simple: "After I [current habit], I will [new habit]." For example: "After I pour my morning coffee, I will write down three things I want to get done today." Or: "After I brush my teeth in the evening, I will read one page of my book." Your existing habit becomes the cue for the new one.

This works because the brain already has strong connections for routines you repeat every day. By linking a new behaviour to them, you borrow their strength. The key is to be specific. "I'll study more" is a wish; "after dinner, I'll study English for fifteen minutes at my desk" is a plan. Over time, the chain of habits runs almost automatically.`,
phrases:[{term:'trigger',meaning_de:'Auslöser',explanation_en:'something that causes something else to start'},{term:'attach',meaning_de:'anhängen, verbinden',explanation_en:'to connect one thing to another'},{term:'get done',meaning_de:'erledigen',explanation_en:'to finish a task'},{term:'cue',meaning_de:'Signal, Stichwort',explanation_en:'a signal for someone to do something'},{term:'borrow their strength',meaning_de:'sich ihre Stärke ausleihen',explanation_en:'to use the power of something else'}],
questions:[{type:'meaning',q:'Explain "habit stacking" to a friend in two sentences.',hint_de:'Neue Gewohnheit + alte Gewohnheit.',model:'You connect a new habit to something you already do every day. The old habit reminds you to do the new one.'},
{type:'meaning',q:'What is the difference between a "wish" and a "plan" in the text?',hint_de:'Wie konkret?',model:'A wish is vague, but a plan says exactly when, where and how long you will do something.'},
{type:'opinion',q:'Create your own habit stack for learning English: "After I …, I will …"',hint_de:'Nutze die Formel.',model:'After I finish my evening workout, I will open the English app and do my daily session.'}]},

{ id:'t11', title:'Fast Fashion and the Real Price of a T-Shirt', topic:'Society', text:
`A T-shirt for five euros seems like a great deal. But someone, somewhere, pays the difference. Fast fashion brands produce new collections every few weeks, encouraging customers to buy more clothes than they actually need – and to throw them away after wearing them only a few times.

The environmental impact is huge. The fashion industry is responsible for a significant share of global carbon emissions, and producing a single cotton T-shirt can require around 2,700 litres of water. On top of that, many garment workers earn wages that are barely enough to live on.

So what can individuals do? Buying less is the most effective step. Choosing quality over quantity, repairing clothes and buying second-hand all make a difference. Nobody has to be perfect. But next time you are tempted by a bargain, it's worth asking a simple question: will I still wear this a year from now?`,
phrases:[{term:'a great deal',meaning_de:'ein tolles Angebot / Schnäppchen',explanation_en:'something you buy for a good price'},{term:'impact',meaning_de:'Auswirkung',explanation_en:'a strong effect'},{term:'share',meaning_de:'Anteil',explanation_en:'a part of a total'},{term:'barely',meaning_de:'kaum',explanation_en:'only just; almost not'},{term:'quality over quantity',meaning_de:'Qualität statt Quantität',explanation_en:'better to have fewer good things than many bad ones'}],
questions:[{type:'meaning',q:'What does "someone, somewhere, pays the difference" mean?',hint_de:'Wer zahlt, wenn das T-Shirt so billig ist?',model:'It means the low price has a hidden cost, for example for workers with low wages or for the environment.'},
{type:'meaning',q:'What does "barely enough to live on" tell you about the workers?',hint_de:'barely = kaum',model:'It means their salary is so low that they can only just pay for basic things like food and rent.'},
{type:'opinion',q:'Look at your own shopping habits. Is there one thing you could change?',hint_de:'Ein konkreter Schritt.',model:'I could buy fewer sports shirts and only replace them when they are broken.'}]},

{ id:'t12', title:'What Running Teaches You About Patience', topic:'Sport', text:
`Almost everyone who starts running makes the same mistake: they go too fast. They finish their first runs out of breath, with aching legs, and conclude that running isn't for them.

Experienced coaches recommend the opposite. Most of your runs should be so slow that you could hold a conversation. It feels almost embarrassing at first – you may even be overtaken by people walking their dogs. But slow running builds the foundation: your heart becomes more efficient, your tendons and joints adapt, and you can train more often without getting injured.

After a few months, something surprising happens. Your "slow" pace becomes faster without any extra effort. That is the lesson: progress often comes from doing easy things consistently, not hard things occasionally. It is true for running, and it is just as true for learning a language, saving money or building a business. Patience is not the opposite of ambition – it is what makes ambition possible.`,
phrases:[{term:'out of breath',meaning_de:'außer Atem',explanation_en:'breathing very fast after exercise'},{term:'aching',meaning_de:'schmerzend',explanation_en:'having a continuous dull pain'},{term:'overtaken',meaning_de:'überholt',explanation_en:'passed by someone going faster'},{term:'foundation',meaning_de:'Grundlage, Fundament',explanation_en:'the basic part that everything else is built on'},{term:'occasionally',meaning_de:'gelegentlich',explanation_en:'sometimes, not often'}],
questions:[{type:'meaning',q:'Why do coaches say most runs should be slow?',hint_de:'Herz, Sehnen, Verletzungen.',model:'Because slow runs make your heart stronger and your body can adapt, so you do not get injured and can train often.'},
{type:'meaning',q:'Explain the last sentence: "Patience is not the opposite of ambition".',hint_de:'Ehrgeiz und Geduld – Gegensätze?',model:'It means you can be patient and ambitious at the same time; patience actually helps you reach big goals.'},
{type:'opinion',q:'In which area of your life do you need more patience?',hint_de:'Sport, Englisch, Geld …',model:'I need more patience with my English, because I want to speak perfectly very fast.'}]},

{ id:'t13', title:'AI in the Classroom', topic:'Technology', text:
`When AI chatbots became widely available, many schools reacted with panic. Students could suddenly generate essays in seconds, and teachers had no reliable way to detect it. Some schools banned the tools completely.

Today, the picture is more nuanced. Many teachers have realised that banning AI is unrealistic, so they are changing how they teach instead. Some ask students to write in class or to explain their thinking out loud. Others use AI deliberately: students let a chatbot write a text and then have to find its mistakes and weak arguments.

Used well, AI can act like a personal tutor that is available at any time and never loses patience. Used badly, it lets students skip the very effort that makes learning stick. The difference lies in how you use it: as a shortcut to avoid thinking, or as a sparring partner that challenges you to think harder.`,
phrases:[{term:'reliable',meaning_de:'zuverlässig',explanation_en:'that you can trust'},{term:'nuanced',meaning_de:'differenziert, vielschichtig',explanation_en:'showing small but important differences'},{term:'deliberately',meaning_de:'bewusst, absichtlich',explanation_en:'on purpose, after thinking about it'},{term:'stick',meaning_de:'hängen bleiben (im Kopf)',explanation_en:'to stay in your memory'},{term:'sparring partner',meaning_de:'Trainingspartner (zum Üben)',explanation_en:'someone you practise with who challenges you'}],
questions:[{type:'meaning',q:'What does "makes learning stick" mean?',hint_de:'stick = kleben',model:'It means you remember what you learned for a long time.'},
{type:'meaning',q:'What is the difference between using AI as a "shortcut" and as a "sparring partner"?',hint_de:'Denken vermeiden vs. mehr denken.',model:'As a shortcut, AI does the work for you; as a sparring partner, it makes you think more and gives you feedback.'},
{type:'opinion',q:'How do you want to use AI for your own learning – and what should you avoid?',hint_de:'Denk an diese App.',model:'I want AI to correct my essays, but I should not let it write the texts for me.'}]},

{ id:'t14', title:'The Psychology of Money', topic:'Money', text:
`Why do some people with high salaries end up broke while others with modest incomes build real wealth? According to many financial writers, the answer has less to do with maths and more to do with behaviour.

A key concept is lifestyle creep. When people earn more, they tend to spend more – a bigger flat, a nicer car, more expensive holidays. Their income rises, but their savings stay the same. Another trap is comparing yourself to others. Social media constantly shows us people who seem richer, which makes us feel we are falling behind.

The people who do well with money often follow simple rules: they pay themselves first by saving a fixed amount as soon as their salary arrives, they avoid debt for things they don't need, and they think long term. Getting rich slowly isn't exciting. But as one investor put it, the goal is not to get rich quickly – it is to stay rich.`,
phrases:[{term:'broke',meaning_de:'pleite',explanation_en:'having no money'},{term:'modest',meaning_de:'bescheiden',explanation_en:'not very large'},{term:'tend to',meaning_de:'dazu neigen',explanation_en:'to usually do something'},{term:'falling behind',meaning_de:'zurückfallen',explanation_en:'making less progress than others'},{term:'pay yourself first',meaning_de:'zuerst an dich selbst zahlen (zuerst sparen)',explanation_en:'to save money before you spend on anything else'}],
questions:[{type:'meaning',q:'Explain "lifestyle creep" in your own words.',hint_de:'creep = langsam kriechen',model:'When you earn more money, you slowly start spending more, so you do not save more.'},
{type:'meaning',q:'What does "pay yourself first" mean?',hint_de:'Wann wird gespart?',model:'It means you put money into savings as soon as you get your salary, before you spend anything.'},
{type:'opinion',q:'Which of the money rules in the text would be easiest for you to follow? Why?',hint_de:'Wähle eine Regel.',model:'Paying myself first would be easy because I could set up an automatic transfer.'}]},

{ id:'t15', title:'Why Handwriting Still Matters', topic:'Learning', text:
`In a world of laptops and smartphones, writing by hand can seem old-fashioned. Many students type their notes because it is faster. But research suggests that speed is exactly the problem.

When you type, it's easy to write down almost every word the lecturer says without really processing it. When you write by hand, you can't keep up, so you are forced to summarise and choose what is important. That extra mental work helps you understand and remember the material better. Brain scans also show that handwriting activates more areas of the brain than typing.

This doesn't mean we should throw our keyboards away. For long texts and editing, typing is clearly more practical. But for learning new vocabulary, planning a project or reflecting on your day, a pen and a notebook can be surprisingly powerful. Sometimes, slower is smarter.`,
phrases:[{term:'old-fashioned',meaning_de:'altmodisch',explanation_en:'not modern'},{term:'processing',meaning_de:'verarbeiten',explanation_en:'thinking about information so you understand it'},{term:"can't keep up",meaning_de:'nicht mithalten können',explanation_en:'to not be able to go as fast as something else'},{term:'summarise',meaning_de:'zusammenfassen',explanation_en:'to give the main points in a short form'},{term:'surprisingly',meaning_de:'überraschend',explanation_en:'in a way you did not expect'}],
questions:[{type:'meaning',q:'Why is speed "exactly the problem" when typing notes?',hint_de:'Was macht man beim Tippen nicht?',model:'Because you can write everything without thinking, so you do not really process or understand it.'},
{type:'meaning',q:'What does "can\'t keep up" mean in the second paragraph?',hint_de:'Mit der Hand ist man langsamer als der Sprecher.',model:'It means you cannot write as fast as the lecturer speaks.'},
{type:'opinion',q:'Do you prefer writing by hand or typing when you learn? Explain.',hint_de:'Mit Beispiel.',model:'I prefer writing by hand for vocabulary, because I remember the words better.'}]},

{ id:'t16', title:'Small Talk Is Not Small', topic:'Communication', text:
`Many people hate small talk. Chatting about the weather or the weekend feels superficial, especially for those who prefer deep conversations. But small talk has an important social function: it signals that we are friendly and safe to talk to.

In English-speaking cultures, small talk is especially common. A colleague in London might ask "How are you?" without expecting a detailed answer – "Good, thanks, and you?" is perfectly fine. A short chat before a meeting creates a relaxed atmosphere and makes it easier to discuss difficult topics later.

The good news is that small talk is a skill you can learn. Ask open questions that start with "what" or "how" instead of questions with a yes/no answer. Listen for details you can follow up on: "You said you've just been to Spain – what was the best part?" And don't worry about being perfect. People rarely remember exactly what you said, but they remember how you made them feel.`,
phrases:[{term:'superficial',meaning_de:'oberflächlich',explanation_en:'not deep or serious'},{term:'signals',meaning_de:'signalisiert, zeigt',explanation_en:'shows or communicates something'},{term:'atmosphere',meaning_de:'Stimmung, Atmosphäre',explanation_en:'the feeling in a place or situation'},{term:'follow up on',meaning_de:'nachhaken, weiterverfolgen',explanation_en:'to ask more about something mentioned before'},{term:'rarely',meaning_de:'selten',explanation_en:'not often'}],
questions:[{type:'meaning',q:'What is the "social function" of small talk according to the text?',hint_de:'Was zeigt man damit?',model:'It shows other people that you are friendly and that they can feel safe talking to you.'},
{type:'meaning',q:'Give your own example of how to "follow up on" a detail in a conversation.',hint_de:'Nutze eine Frage mit what/how.',model:'If someone says they started a new job, I can ask: "How is it going so far?"'},
{type:'opinion',q:'Write three small-talk questions you could ask a new colleague.',hint_de:'Offene Fragen!',model:'What do you like doing at the weekend? How did you get into this job? What was the best trip you have ever made?'}]},

{ id:'t17', title:'The Power of Saying No', topic:'Mindset', text:
`Steve Jobs once said that focus means saying no to a hundred good ideas. Most of us find this incredibly difficult. We say yes to an extra project at work, a party we don't want to go to, or a favour we don't have time for – because we don't want to disappoint anyone.

The problem is that every yes is also a no to something else. If you say yes to a late night out, you are saying no to your morning training. If you agree to every request, you have no time left for your own priorities.

Saying no doesn't have to be rude. You can be friendly but firm: "Thanks for thinking of me, but I can't take that on right now." You don't always need to give a long explanation. Most people will respect a clear answer more than a hesitant yes followed by a last-minute cancellation. Protecting your time is not selfish – it's what allows you to give your best to the things that truly matter.`,
phrases:[{term:'disappoint',meaning_de:'enttäuschen',explanation_en:'to make someone sad because you did not do what they hoped'},{term:'priorities',meaning_de:'Prioritäten',explanation_en:'the things that are most important to you'},{term:'firm',meaning_de:'bestimmt, fest',explanation_en:'strong and not changing your mind'},{term:'take on',meaning_de:'übernehmen',explanation_en:'to accept a job or responsibility'},{term:'hesitant',meaning_de:'zögerlich',explanation_en:'not sure, slow to act'}],
questions:[{type:'meaning',q:'What does "every yes is also a no to something else" mean? Use your own example.',hint_de:'Zeit ist begrenzt.',model:'If you agree to one thing, you lose time for another. For example, if I say yes to gaming all night, I say no to sleeping well.'},
{type:'meaning',q:'What does "friendly but firm" mean?',hint_de:'Wie sagt man nein?',model:'It means you are polite, but you clearly say no and do not change your answer.'},
{type:'opinion',q:'What is something you should say no to more often during your Monk Mode?',hint_de:'Ehrlich!',model:'I should say no to late-night social media, because it destroys my sleep.'}]},

{ id:'t18', title:'Why Cities Are Getting Rid of Cars', topic:'Society', text:
`In cities like Paris, Barcelona and Copenhagen, something remarkable is happening: streets that were once full of cars are being turned into bike lanes, parks and pedestrian zones. Supporters say this makes cities healthier, quieter and safer.

The figures are impressive. When Paris closed certain roads to traffic, air pollution there fell noticeably. Shops in car-free areas often report more customers, not fewer, because people on foot or on bikes tend to stop more often than drivers.

Not everyone is happy, though. People who live in the suburbs and depend on their cars complain that they are being pushed out, and craftsmen who need to transport tools worry about access. Successful cities therefore invest heavily in public transport before they reduce car traffic. The aim is not to punish drivers, but to make the alternatives so good that many people no longer need a car at all.`,
phrases:[{term:'remarkable',meaning_de:'bemerkenswert',explanation_en:'unusual and surprising'},{term:'pedestrian',meaning_de:'Fußgänger(-)',explanation_en:'a person walking in the street'},{term:'noticeably',meaning_de:'merklich, spürbar',explanation_en:'in a way that is easy to see'},{term:'depend on',meaning_de:'abhängig sein von, angewiesen sein auf',explanation_en:'to need something'},{term:'punish',meaning_de:'bestrafen',explanation_en:'to make someone suffer because they did something wrong'}],
questions:[{type:'meaning',q:'Why do shops in car-free areas often have more customers?',hint_de:'Wer bleibt öfter stehen?',model:'Because people who walk or cycle stop more often at shops than people who drive past.'},
{type:'meaning',q:'Explain the last sentence in your own words.',hint_de:'Bestrafen vs. bessere Alternativen.',model:'The idea is not to make life hard for drivers, but to offer such good buses, trains and bike lanes that people do not need a car.'},
{type:'opinion',q:'Would you like your city to have fewer cars? What would change for you?',hint_de:'Vor- und Nachteile.',model:'Yes, because I cycle a lot, but it would be harder to visit my family in the countryside.'}]},

{ id:'t19', title:'Gratitude Without the Cheesiness', topic:'Mindset', text:
`"Write down three things you are grateful for." For many people, this advice sounds cheesy, like something from a motivational poster. Yet gratitude is one of the most researched topics in positive psychology, and the results are surprisingly solid.

People who regularly note what went well tend to sleep better, feel less stressed and are more satisfied with their lives. The reason may be that our brains are wired to focus on problems and threats. Gratitude exercises balance this negativity bias by training us to notice the good things too.

The trick is to be specific. "I'm grateful for my family" quickly becomes a routine phrase you write without feeling anything. "My brother called me today just to ask how my exam went" is much more powerful. It doesn't have to be big. A good coffee, a productive hour, finishing a hard workout – it all counts. Two minutes before bed is enough.`,
phrases:[{term:'cheesy',meaning_de:'kitschig',explanation_en:'too emotional or sweet in a way that seems silly'},{term:'solid',meaning_de:'solide, belastbar',explanation_en:'reliable and strong'},{term:'wired to',meaning_de:'darauf programmiert / gepolt',explanation_en:'naturally made to do something'},{term:'bias',meaning_de:'Verzerrung, Voreingenommenheit',explanation_en:'a tendency to see things in one particular way'},{term:'it all counts',meaning_de:'alles zählt',explanation_en:'every small thing is important too'}],
questions:[{type:'meaning',q:'What is the "negativity bias" mentioned in the text?',hint_de:'Worauf achtet das Gehirn mehr?',model:'It is the tendency of our brain to pay more attention to problems and dangers than to good things.'},
{type:'meaning',q:'Why is a specific example better than "I\'m grateful for my family"?',hint_de:'Gefühl vs. Routine-Satz.',model:'Because a general phrase becomes automatic, but a concrete moment makes you really feel the gratitude.'},
{type:'opinion',q:'Write three specific things from today that you are grateful for.',hint_de:'Ganz konkret!',model:'I am grateful that my training felt easy today, that my friend helped me with my bike and that I finished a chapter of my book.'}]},

{ id:'t20', title:'What Makes a Good Apology', topic:'Communication', text:
`Everyone makes mistakes, but not everyone knows how to apologise. "I'm sorry if you were offended" is a classic example of an apology that isn't really one. It puts the responsibility on the other person's feelings instead of on what you did.

Researchers who studied apologies found that the most effective ones contain a few key elements. First, you clearly admit what you did wrong. Second, you acknowledge how it affected the other person. Third, you offer to make up for it or explain what you will do differently in future. Interestingly, people value the admission of responsibility more than anything else.

What you should avoid is the word "but". "I'm sorry I was late, but the traffic was terrible" turns your apology into an excuse. Explanations can come later, if the other person wants to hear them. A good apology doesn't make you look weak. On the contrary, it shows that you are confident enough to take responsibility.`,
phrases:[{term:'offended',meaning_de:'beleidigt, gekränkt',explanation_en:'upset because of something someone said or did'},{term:'admit',meaning_de:'zugeben',explanation_en:'to say that something bad is true'},{term:'acknowledge',meaning_de:'anerkennen, eingestehen',explanation_en:'to accept or show that you know something is true'},{term:'make up for',meaning_de:'wiedergutmachen',explanation_en:'to do something good because you did something bad before'},{term:'on the contrary',meaning_de:'im Gegenteil',explanation_en:'the opposite is true'}],
questions:[{type:'meaning',q:'Why is "I\'m sorry if you were offended" not a real apology?',hint_de:'Wer ist verantwortlich?',model:'Because it talks about the other person\'s feelings and does not say that you did something wrong.'},
{type:'meaning',q:'What does "make up for it" mean? Give an example.',hint_de:'wiedergutmachen',model:'It means doing something good to fix a mistake, for example inviting a friend for dinner after you forgot his birthday.'},
{type:'opinion',q:'Write a short, good apology to a friend because you missed his birthday party.',hint_de:'Nutze die drei Elemente – ohne "but".',model:'I\'m really sorry I missed your party. I know you were looking forward to it and I let you down. Let me take you out for dinner this weekend.'}]}
];
