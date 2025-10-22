const tenseShortDescriptions = {
  present: 'Actions happening now or regularly.',
  past_simple: 'Actions completed at a specific past moment.',
  present_perfect: 'Actions linking the past to the present.',
  imperfect_indicative: 'Ongoing or habitual actions in the past.',
  future_simple: 'Actions that will happen.',
  condicional_simple: 'Actions that would happen.',
  imperative: 'Affirmative commands or requests.',
  imperative_negative: 'Negative commands or requests.'
};

const specificInfoData = {
  timerMode: {
    title: "⏱️ Time attack ⏱️ (4 Minutes)",
    html: `You have <strong>4 minutes</strong> to score as many points as possible.<br>
           <strong class="modal-subtitle">Time Mechanics:</strong><br>
           - Start with 4:00 minutes.<br>
           - Correct answers ✅ add time based on your streak (<span class="emphasis-mechanic">+5s to +10s</span>). No upper time limit.<br>
           - Incorrect/Skipped answers ❌ deduct <span class="emphasis-mechanic">3 seconds</span>.<br><br>
           <strong class="modal-subtitle">Time UI:</strong><br>
           - ⏳ Remaining Time: Main clock (turns <span class="text-red">red</span> and pulses in the last 10s).<br>
           - ➕➖ Time Change: Brief notes like "<span class="text-green">+5s</span>" or "<span class="text-red">-3s</span>".<br>
           - 🏁 Total Time Played: Shows your current session duration.<br><br>
           <strong class="modal-subtitle">Scoring Bonuses (per question):</strong><br>
           - Streak Bonus: Multiplies points for consecutive correct answers.<br>
           - Speed Bonus: Answering in under 5 seconds gives an additional score multiplier (up to <span class="points-value">x2.0</span>).<br><br>
           <strong class="modal-subtitle">Levels & Clues:</strong><br>
           - Every 10 correct answers you advance a level and gain <strong>1 free clue</strong>.<br>
           - Without free clues, using one deducts time based on your level (<span class="emphasis-mechanic">3s, 6s, 13s, 25s</span>, and then it doubles).<br><br>
           <strong class="modal-subtitle">Goal:</strong> Maximize your score before time runs out!`
  },
  livesMode: {
    title: "❤️‍🩹 Survival ❤️‍🩹",
    html: `Survive as long as you can! You start with <strong>5 lives</strong> (❤️).<br>
           Each incorrect or skipped answer costs one life.<br><br>
           <strong class="modal-subtitle">Gaining Extra Lives:</strong><br>
           1. <strong>Accumulated Correct Answers:</strong> Earn a life by getting a specific total number of correct answers (e.g., <code>🎯 X to get 1❤️</code>). The target increases each time.<br>
           2. <strong>Streaks:</strong> Achieve specific streaks of consecutive correct answers (e.g., <code>🔥 Y in a row for 1❤️</code>). This target also increases.<br>
           3. <strong class="emphasis-mechanic">🎁 Prize Verbs:</strong>
              - Appear randomly in "<span class="difficulty-normal">Conjugate</span>" (⚙️) and "<span class="difficulty-hard">Produce</span>" (⌨️) difficulties if the verb is irregular or reflexive.<br>
              - Chance: Approx. <span class="emphasis-mechanic">1 in 30</span> for "Conjugate", approx. <span class="emphasis-mechanic">1 in 20</span> for "Produce".<br>
              - Correctly conjugating a prize verb (marked with 🎁) grants an <span class="emphasis-mechanic">extra life!</span><br>
           <br><strong class="modal-subtitle">Levels & Clues:</strong><br>
           - Level up every 10 correct answers and receive <strong>1 free clue</strong>.<br>
           - If you have no free clues, using one costs lives: 1 life at Level 1, 2 at Level 2, and so on.<br><br>
          <strong class="modal-subtitle">Goal:</strong> Stay alive and get the highest score!`
  },
  studyMode: {
    title: "📚 Study Mode ✏️",
    html: `<p>A minimalist mode for focused practice without distractions.</p>
         <strong class="modal-subtitle">Features:</strong>
         <ul>
           <li>No points, no score, no streaks.</li>
           <li>No timer or lives.</li>
           <li>No character or character sounds.</li>
           <li>The feedback area is used only for providing clues or showing the correct answer.</li>
         </ul>
         <p><strong>Goal:</strong> Practice conjugations at your own pace.</p>`
  },
  receptiveConfig: {
    title: "💭 Recall Mode",
    html: `<strong>Difficulty:</strong> <span class="difficulty-easy">Easy to Medium</span><br>
           You'll see a conjugated Spanish verb and its tense. Your task is to provide the correct <strong>English subject pronoun AND the conjugated English verb</strong>.<br><br>
           <strong class="modal-subtitle">Quick Tense Translation Guide (Spanish to English):</strong><br>
             <li><strong>Present (Presente):</strong> Usually like "<span class="tense-example">I eat</span>", "<span class="tense-example">he eats</span>".</li>
             <li><strong>Simple Past (Pretérito):</strong> Usually "<span class="tense-example">I ate</span>", "<span class="tense-example">he ate</span>".</li>
             <li><strong>Present Perfect (Pret. Perfecto):</strong> "<span class="tense-example">I have eaten</span>", "<span class="tense-example">he has eaten</span>".</li>
             <li><strong>Imperfect (Imperfecto):</strong> Often "<span class="tense-example">I was eating</span>" (ongoing past) or "<span class="tense-example">I used to eat</span>" (habitual past). Context is key!</li>
             <li><strong>Future (Futuro):</strong> "<span class="tense-example">I will eat</span>", "<span class="tense-example">he will eat</span>".</li>
             <li><strong>Conditional (Condicional):</strong> "<span class="tense-example">I would eat</span>", "<span class="tense-example">he would eat</span>".</li>
           </ul>
           <em>Example:</em> <span class="example-prompt-text">SIMPLE PAST: comí</span> You type:
           <div class="typing-animation-container"><div class="typing-animation" id="recall-example-anim"></div></div>
           <strong>Base Points:</strong> <span class="points-value">+5</span> per correct answer.<br>
           <span class="points-value">+2</span> for each extra tense selected.<br>
           While this is the easiest mode, translation can be tricky! Some Spanish verbs don't have a single, direct English equivalent, and tenses can translate in multiple ways.`
  },
  productiveEasyConfig: {
    title: "⚙️ Conjugate Mode",
    html: `<strong>Difficulty:</strong> <span class="difficulty-normal">Normal</span><br>
           This mode is a direct test of your Spanish conjugation skills. You'll be given a Spanish verb infinitive, a Spanish pronoun, and the tense.<br><br>
           Your mission is to type the correctly conjugated Spanish verb form. Focus on standard conjugation rules and irregularities.<br>
           <em>Example:</em> <span class="example-prompt-text">Presente: conjugar – nosotros</span> You type:
           <div class="typing-animation-container"><div class="typing-animation" id="conjugate-example-anim"></div></div>
           <strong>Base Points:</strong> <span class="points-value">+10</span> per correct answer.<br>
           <span class="points-value">+2</span> for each extra tense selected.<br>
           <strong class="emphasis-mechanic">❤️‍🩹 Survival Bonus:</strong> When playing in "Survival Mode", irregular or reflexive verbs in "Conjugate" have a <span class="emphasis-mechanic">~1 in 30</span> chance of being a 🎁 Prize Verb for an extra life!`
  },
  productiveConfig: {
    title: "⌨️ Produce Mode",
    html: `<strong>Difficulty:</strong> <span class="difficulty-hard">Hard</span><br>
           The most challenging mode! You'll get an English verb infinitive, a Spanish pronoun, and the tense.<br><br>
           You need to:<br>
             <li>Know the correct Spanish infinitive for the English verb.</li>
             <li>Correctly conjugate that Spanish verb according to the pronoun and tense, including irregularities.</li>
           </ol>
           This truly tests your ability to think in Spanish.<br>
           <em>Example:</em> <span class="example-prompt-text">Present: to love – yo</span> You type:
           <div class="typing-animation-container"><div class="typing-animation" id="produce-example-anim"></div></div>
           <strong>Base Points:</strong> <span class="points-value">+15</span> per correct answer.<br>
           <span class="points-value">+2</span> for each extra tense selected.<br>
          <strong class="emphasis-mechanic">❤️‍🩹 Survival Bonus:</strong> When playing in "Survival Mode", irregular or reflexive verbs in "Produce" have a <span class="emphasis-mechanic">~1 in 20</span> chance of being a 🎁 Prize Verb for an extra life!`
  },
  accentHelp: {
    title: "Ignore Accents",
    html: `When this option is <strong>ON</strong>, you don't need to type accent marks to be correct.<br>
           Leaving it <strong>OFF</strong> grants a <span class="points-value">+8</span> bonus each time you include the correct accents.`
  },
  presentInfo: {
    title: "Present Tense (Presente de Indicativo)",
    html: `<p>The Present Tense describes actions happening <strong>now</strong>, <strong>habits</strong>, and <strong>universal truths</strong>.</p>
           <strong class="modal-subtitle">Key Uses:</strong>
           <ul>
             <li><strong>Current Actions:</strong> <em>"¿Qué <strong>haces</strong>?"</em> (What are you doing?)</li>
             <li><strong>Habits/Routines:</strong> <em>"Yo <strong>como</strong> paella los domingos."</em> (I eat paella on Sundays.)</li>
             <li><strong>General Truths:</strong> <em>"El sol <strong>sale</strong> por el este."</em> (The sun rises in the east.)</li>
             <li><strong>Near Future:</strong> <em>"Mañana <strong>tengo</strong> un examen."</em> (Tomorrow I have an exam.)</li>
           </ul>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>-ar</th><th>-er</th><th>-ir</th></tr>
             <tr><td>yo</td><td>-o</td><td>-o</td><td>-o</td></tr>
             <tr><td>tú</td><td>-as</td><td>-es</td><td>-es</td></tr>
             <tr><td>él/ella/ud.</td><td>-a</td><td>-e</td><td>-e</td></tr>
             <tr><td>nosotros</td><td>-amos</td><td>-emos</td><td>-imos</td></tr>
             <tr><td>vosotros</td><td>-áis</td><td>-éis</td><td>-ís</td></tr>
             <tr><td>ellos/ellas/uds.</td><td>-an</td><td>-en</td><td>-en</td></tr>
           </table>
           <p class="recall-tip"><strong>Recall Mode:</strong> "I eat" / "he eats"</p>`
  },
  pastSimpleInfo: {
    title: "Simple Past / Preterite (Pretérito)",
    html: `<p>The Preterite is used for actions that were <strong>completed in the past</strong> at a specific moment.</p>
           <strong class="modal-subtitle">Key Uses:</strong>
           <ul>
             <li><strong>Single, Completed Actions:</strong> <em>"Ayer <strong>compré</strong> un libro."</em> (Yesterday I bought a book.)</li>
             <li><strong>Beginning/End of an Action:</strong> <em>"La película <strong>empezó</strong> a las nueve."</em> (The movie started at nine.)</li>
             <li><strong>A Series of Events:</strong> <em>"<strong>Llegué</strong>, <strong>vi</strong> y <strong>vencí</strong>."</em> (I arrived, I saw, and I conquered.)</li>
           </ul>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>-ar</th><th>-er/-ir</th></tr>
             <tr><td>yo</td><td>-é</td><td>-í</td></tr>
             <tr><td>tú</td><td>-aste</td><td>-iste</td></tr>
             <tr><td>él/ella/ud.</td><td>-ó</td><td>-ió</td></tr>
             <tr><td>nosotros</td><td>-amos</td><td>-imos</td></tr>
             <tr><td>vosotros</td><td>-asteis</td><td>-isteis</td></tr>
             <tr><td>ellos/ellas/uds.</td><td>-aron</td><td>-ieron</td></tr>
           </table>
           <p class="recall-tip"><strong>Recall Mode:</strong> "I ate" / "he ate"</p>`
  },
  presentPerfectInfo: {
    title: "Present Perfect (Pretérito Perfecto)",
    html: `<p>This tense connects <strong>past actions to the present</strong>. It's formed with <strong>haber</strong> + past participle.</p>
           <strong class="modal-subtitle">Key Uses:</strong>
           <ul>
             <li><strong>Recent Past:</strong> <em>"Esta mañana <strong>he bebido</strong> café."</em> (This morning I drank coffee.)</li>
             <li><strong>Life Experiences:</strong> <em>"¿Alguna vez <strong>has viajado</strong> a España?"</em> (Have you ever traveled to Spain?)</li>
             <li><strong>Actions that Continue:</strong> <em>"Siempre <strong>hemos vivido</strong> aquí."</em> (We have always lived here.)</li>
           </ul>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>Haber</th><th>+ Participle</th></tr>
             <tr><td>yo</td><td>he</td><td rowspan="6">habl<strong>ado</strong><br>com<strong>ido</strong><br>viv<strong>ido</strong></td></tr>
             <tr><td>tú</td><td>has</td></tr>
             <tr><td>él/ella/ud.</td><td>ha</td></tr>
             <tr><td>nosotros</td><td>hemos</td></tr>
             <tr><td>vosotros</td><td>habéis</td></tr>
             <tr><td>ellos/ellas/uds.</td><td>han</td></tr>
           </table>
           <p><strong>Irregular Participles:</strong> abrir → abierto, decir → dicho, ver → visto, poner → puesto.</p>
           <p class="recall-tip"><strong>Recall Mode:</strong> "I have eaten" / "he has eaten"</p>`
  },
  imperfectInfo: {
    title: "Imperfect (Pretérito Imperfecto)",
    html: `<p>The Imperfect describes <strong>ongoing or repeated actions in the past</strong> without a clear end.</p>
           <strong class="modal-subtitle">Key Uses (W.A.T.E.R.S.):</strong>
           <ul>
             <li><strong>Weather:</strong> <em>"<strong>Llovía</strong> mucho."</em> (It was raining a lot.)</li>
             <li><strong>Age:</strong> <em>"Cuando <strong>tenía</strong> diez años..."</em> (When I was ten years old...)</li>
             <li><strong>Time:</strong> <em>"<strong>Eran</strong> las tres de la tarde."</em> (It was 3 PM.)</li>
             <li><strong>Emotion/Condition:</strong> <em>"Yo <strong>estaba</strong> cansado."</em> (I was tired.)</li>
             <li><strong>Repetition:</strong> <em>"Siempre <strong>jugábamos</strong> en el parque."</em> (We always used to play in the park.)</li>
             <li><strong>Setting the Scene:</strong> <em>"La luna <strong>brillaba</strong> y los pájaros <strong>cantaban</strong>..."</em> (The moon was shining and the birds were singing...)</li>
           </ul>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>-ar</th><th>-er/-ir</th></tr>
             <tr><td>yo</td><td>-aba</td><td>-ía</td></tr>
             <tr><td>tú</td><td>-abas</td><td>-ías</td></tr>
             <tr><td>él/ella/ud.</td><td>-aba</td><td>-ía</td></tr>
             <tr><td>nosotros</td><td>-ábamos</td><td>-íamos</td></tr>
             <tr><td>vosotros</td><td>-abais</td><td>-íais</td></tr>
             <tr><td>ellos/ellas/uds.</td><td>-aban</td><td>-ían</td></tr>
           </table>
           <p><strong>Only 3 Irregular Verbs:</strong> ir (iba), ser (era), and ver (veía).</p>
           <p class="recall-tip"><strong>Recall Mode:</strong> "I was eating" / "I used to eat"</p>`
  },
  futureInfo: {
    title: "Future (Futuro Simple)",
    html: `<p>Used for actions that <strong>will happen</strong>. The endings are added to the <strong>entire infinitive</strong>.</p>
           <strong class="modal-subtitle">Key Uses:</strong>
           <ul>
             <li><strong>Predictions/Future Events:</strong> <em>"Mañana <strong>lloverá</strong>."</em> (It will rain tomorrow.)</li>
             <li><strong>Promises:</strong> <em>"Te <strong>llamaré</strong> luego."</em> (I will call you later.)</li>
             <li><strong>Wonder/Probability in the Present:</strong> <em>"¿Dónde <strong>estará</strong> María?"</em> (I wonder where Maria is? / Where could Maria be?)</li>
           </ul>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>Ending (for all verbs)</th></tr>
             <tr><td>yo</td><td>-é</td></tr>
             <tr><td>tú</td><td>-ás</td></tr>
             <tr><td>él/ella/ud.</td><td>-á</td></tr>
             <tr><td>nosotros</td><td>-emos</td></tr>
             <tr><td>vosotros</td><td>-éis</td></tr>
             <tr><td>ellos/ellas/uds.</td><td>-án</td></tr>
           </table>
           <p><strong>Irregular Stems:</strong> decir → dir-, hacer → har-, poder → podr-, tener → tendr-.</p>
           <p class="recall-tip"><strong>Recall Mode:</strong> "I will eat" / "he will eat"</p>`
  },
  conditionalInfo: {
    title: "Conditional (Condicional Simple)",
    html: `<p>Expresses what <strong>would happen</strong>. Like the future, endings are added to the <strong>entire infinitive</strong>.</p>
           <strong class="modal-subtitle">Key Uses:</strong>
           <ul>
             <li><strong>Hypothetical Situations:</strong> <em>"Yo <strong>viajaría</strong> por el mundo."</em> (I would travel the world.)</li>
             <li><strong>Polite Requests:</strong> <em>"¿Me <strong>podrías</strong> ayudar?"</em> (Could you help me?)</li>
             <li><strong>Advice:</strong> <em>"Yo en tu lugar, no lo <strong>haría</strong>."</em> (If I were you, I wouldn't do it.)</li>
             <li><strong>Future in the Past:</strong> <em>"Dijo que <strong>vendría</strong>."</em> (He said he would come.)</li>
           </ul>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>Ending (for all verbs)</th></tr>
             <tr><td>yo</td><td>-ía</td></tr>
             <tr><td>tú</td><td>-ías</td></tr>
             <tr><td>él/ella/ud.</td><td>-ía</td></tr>
             <tr><td>nosotros</td><td>-íamos</td></tr>
             <tr><td>vosotros</td><td>-íais</td></tr>
             <tr><td>ellos/ellas/uds.</td><td>-ían</td></tr>
           </table>
           <p><strong>Irregular Stems:</strong> Same as the future tense (dir-, har-, podr-, tendr-, etc.).</p>
           <p class="recall-tip"><strong>Recall Mode:</strong> "I would eat" / "he would eat"</p>`
  },
  imperativeAffirmativeInfo: {
    title: "Regular Affirmative Imperative",
    html: `<p>Use the affirmative imperative to give <strong>direct commands, invitations, or instructions</strong>.</p>
           <strong class="modal-subtitle">Formation (Regular Verbs):</strong>
           <p>The key is the ending. The stem of the verb does not change.</p>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>-ar (hablar)</th><th>-er (comer)</th><th>-ir (abrir)</th></tr>
             <tr><td>tú</td><td>habl<strong>a</strong></td><td>com<strong>e</strong></td><td>abr<strong>e</strong></td></tr>
             <tr><td>usted</td><td>habl<strong>e</strong></td><td>com<strong>a</strong></td><td>abr<strong>a</strong></td></tr>
             <tr><td>nosotros</td><td>habl<strong>emos</strong></td><td>com<strong>amos</strong></td><td>abr<strong>amos</strong></td></tr>
             <tr><td>vosotros</td><td>habl<strong>ad</strong></td><td>com<strong>ed</strong></td><td>abr<strong>id</strong></td></tr>
             <tr><td>ustedes</td><td>habl<strong>en</strong></td><td>com<strong>an</strong></td><td>abr<strong>an</strong></td></tr>
           </table>
           <strong class="modal-subtitle">Pro Tip: Object Pronouns</strong>
           <p>Pronouns are attached <strong>at the end</strong> of the verb. Remember to add an accent if needed to keep the stress in the right place: <em>¡cóme<strong>lo</strong>!, ¡dáme<strong>lo</strong>!, ¡explíca<strong>nos</strong>!</em></p>`
  },
  imperativeNegativeInfo: {
    title: "Regular Negative Imperative",
    html: `<p>Use the negative imperative to tell someone <strong>NOT</strong> to do something.</p>
           <strong class="modal-subtitle">The Golden Rule (Regular Verbs):</strong>
           <p>It's simple! All forms use <strong>"no" + the present subjunctive</strong>. For regular verbs, this is very predictable.</p>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>-ar (hablar)</th><th>-er/-ir (comer/vivir)</th></tr>
             <tr><td>tú</td><td>no hables</td><td>no comas / no vivas</td></tr>
             <tr><td>usted</td><td>no hable</td><td>no coma / no viva</td></tr>
             <tr><td>nosotros</td><td>no hablemos</td><td>no comamos / no vivamos</td></tr>
             <tr><td>vosotros</td><td>no habléis</td><td>no comáis / no viváis</td></tr>
             <tr><td>ustedes</td><td>no hablen</td><td>no coman / no vivan</td></tr>
           </table>
           <strong class="modal-subtitle">Pro Tip: Object Pronouns</strong>
           <p>Unlike the affirmative, pronouns go <strong>before</strong> the verb: <em>¡No <strong>te</strong> levantes!, ¡No <strong>lo</strong> comas!</em></p>`
  },
  regularInfo: {
    title: "Regular Verbs",
    html: `<p>Regular verbs follow predictable patterns. The stem (the part of the verb before -ar, -er, or -ir) does not change.</p>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>hablar (pres.)</caption>
               <tr><td>yo</td><td>hablo</td></tr>
               <tr><td>tú</td><td>hablas</td></tr>
               <tr><td>él</td><td>habla</td></tr>
               <tr><td>nosotros</td><td>hablamos</td></tr>
               <tr><td>vosotros</td><td>habláis</td></tr>
               <tr><td>ellos</td><td>hablan</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>beber (pres.)</caption>
               <tr><td>yo</td><td>bebo</td></tr>
               <tr><td>tú</td><td>bebes</td></tr>
               <tr><td>él</td><td>bebe</td></tr>
               <tr><td>nosotros</td><td>bebemos</td></tr>
               <tr><td>vosotros</td><td>bebéis</td></tr>
               <tr><td>ellos</td><td>beben</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>vivir (pres.)</caption>
               <tr><td>yo</td><td>vivo</td></tr>
               <tr><td>tú</td><td>vives</td></tr>
               <tr><td>él</td><td>vive</td></tr>
               <tr><td>nosotros</td><td>vivimos</td></tr>
               <tr><td>vosotros</td><td>vivís</td></tr>
               <tr><td>ellos</td><td>viven</td></tr>
             </table>
           </div>
           <p><strong>Examples:</strong> comer, hablar, vivir, estudiar, trabajar</p>`
  },
  regularPastSimpleInfo: {
    title: "Regular Pretérito (Simple Past)",
    html: `<p>These verbs keep a stable stem in the simple past, so you only need to add the standard endings.</p>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>Endings for -ar verbs</caption>
               <tr><td>yo</td><td>-é</td></tr>
               <tr><td>tú</td><td>-aste</td></tr>
               <tr><td>él/ella/ud.</td><td>-ó</td></tr>
               <tr><td>nosotros</td><td>-amos</td></tr>
               <tr><td>vosotros</td><td>-asteis</td></tr>
               <tr><td>ellos/ellas/uds.</td><td>-aron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>Endings for -er / -ir verbs</caption>
               <tr><td>yo</td><td>-í</td></tr>
               <tr><td>tú</td><td>-iste</td></tr>
               <tr><td>él/ella/ud.</td><td>-ió</td></tr>
               <tr><td>nosotros</td><td>-imos</td></tr>
               <tr><td>vosotros</td><td>-isteis</td></tr>
               <tr><td>ellos/ellas/uds.</td><td>-ieron</td></tr>
             </table>
           </div>
           <p class="recall-tip"><strong>Example:</strong> hablar → hablé, hablaste, habló</p>`
  },
  firstPersonInfo: {
    title: "1st Person Irregular (Present)",
    html: `<p>Only the <em>yo</em> form is irregular. The other forms are regular.</p>
           <table class="tense-tooltip-table irregular-tooltip-table">
             <tr><th>Pattern</th><th>Example</th></tr>
             <tr><td>-cer/-cir → -zco</td><td>conocer → cono<span class="irregular-highlight">zco</span></td></tr>
             <tr><td>-go Verbs</td><td>salir → sal<span class="irregular-highlight">go</span>, poner → pon<span class="irregular-highlight">go</span></td></tr>
           </table>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>dar (pres.)</caption>
               <tr><td>yo</td><td>d<span class="irregular-highlight">oy</span></td></tr>
               <tr><td>tú</td><td>das</td></tr>
               <tr><td>él</td><td>da</td></tr>
               <tr><td>nosotros</td><td>damos</td></tr>
               <tr><td>vosotros</td><td>dais</td></tr>
               <tr><td>ellos</td><td>dan</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>saber (pres.)</caption>
               <tr><td>yo</td><td><span class="irregular-highlight">sé</span></td></tr>
               <tr><td>tú</td><td>sabes</td></tr>
               <tr><td>él</td><td>sabe</td></tr>
               <tr><td>nosotros</td><td>sabemos</td></tr>
               <tr><td>vosotros</td><td>sabéis</td></tr>
               <tr><td>ellos</td><td>saben</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>ver (pres.)</caption>
               <tr><td>yo</td><td>v<span class="irregular-highlight">eo</span></td></tr>
               <tr><td>tú</td><td>ves</td></tr>
               <tr><td>él</td><td>ve</td></tr>
               <tr><td>nosotros</td><td>vemos</td></tr>
               <tr><td>vosotros</td><td>veis</td></tr>
               <tr><td>ellos</td><td>ven</td></tr>
             </table>
           </div>`
  },
  stemChangingInfo: {
    title: "Stem Changing (Present)",
    html: `<p>The stem vowel changes in all forms except <strong>nosotros</strong> and <strong>vosotros</strong> (the "boot" verbs).</p>
           <table class="tense-tooltip-table irregular-tooltip-table">
             <tr><th>Change</th><th>Example</th></tr>
             <tr><td>e → ie</td><td>querer → qu<span class="irregular-highlight">ie</span>ro</td></tr>
             <tr><td>o → ue</td><td>poder → p<span class="irregular-highlight">ue</span>do</td></tr>
             <tr><td>e → i</td><td>pedir → p<span class="irregular-highlight">i</span>do</td></tr>
             <tr><td>u → ue</td><td>jugar → j<span class="irregular-highlight">ue</span>go</td></tr>
           </table>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>querer (e→ie)</caption>
               <tr><td>yo</td><td>qu<span class="irregular-highlight">ie</span>ro</td></tr>
               <tr><td>tú</td><td>qu<span class="irregular-highlight">ie</span>res</td></tr>
               <tr><td>él</td><td>qu<span class="irregular-highlight">ie</span>re</td></tr>
               <tr><td>nosotros</td><td>queremos</td></tr>
               <tr><td>vosotros</td><td>queréis</td></tr>
               <tr><td>ellos</td><td>qu<span class="irregular-highlight">ie</span>ren</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>dormir (o→ue)</caption>
               <tr><td>yo</td><td>d<span class="irregular-highlight">ue</span>rmo</td></tr>
               <tr><td>tú</td><td>d<span class="irregular-highlight">ue</span>rmes</td></tr>
               <tr><td>él</td><td>d<span class="irregular-highlight">ue</span>rme</td></tr>
               <tr><td>nosotros</td><td>dormimos</td></tr>
               <tr><td>vosotros</td><td>dormís</td></tr>
               <tr><td>ellos</td><td>d<span class="irregular-highlight">ue</span>rmen</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>pedir (e→i)</caption>
               <tr><td>yo</td><td>p<span class="irregular-highlight">i</span>do</td></tr>
               <tr><td>tú</td><td>p<span class="irregular-highlight">i</span>des</td></tr>
               <tr><td>él</td><td>p<span class="irregular-highlight">i</span>de</td></tr>
               <tr><td>nosotros</td><td>pedimos</td></tr>
               <tr><td>vosotros</td><td>pedís</td></tr>
               <tr><td>ellos</td><td>p<span class="irregular-highlight">i</span>den</td></tr>
             </table>
           </div>`
  },
  multipleIrregularInfo: {
    title: "Multiple Irregularities (Present)",
    html: `<p>These verbs have both an irregular <strong>yo</strong> form and <strong>stem changes</strong> in other forms.</p>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>tener</caption>
               <tr><td>yo</td><td>ten<span class="irregular-highlight">go</span></td></tr>
               <tr><td>tú</td><td>t<span class="irregular-highlight">ie</span>nes</td></tr>
               <tr><td>él</td><td>t<span class="irregular-highlight">ie</span>ne</td></tr>
               <tr><td>nosotros</td><td>tenemos</td></tr>
               <tr><td>vosotros</td><td>tenéis</td></tr>
               <tr><td>ellos</td><td>t<span class="irregular-highlight">ie</span>nen</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>decir</caption>
               <tr><td>yo</td><td>d<span class="irregular-highlight">igo</span></td></tr>
               <tr><td>tú</td><td>d<span class="irregular-highlight">i</span>ces</td></tr>
               <tr><td>él</td><td>d<span class="irregular-highlight">i</span>ce</td></tr>
               <tr><td>nosotros</td><td>decimos</td></tr>
               <tr><td>vosotros</td><td>decís</td></tr>
               <tr><td>ellos</td><td>d<span class="irregular-highlight">i</span>cen</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>venir</caption>
               <tr><td>yo</td><td>ven<span class="irregular-highlight">go</span></td></tr>
               <tr><td>tú</td><td>v<span class="irregular-highlight">ie</span>nes</td></tr>
               <tr><td>él</td><td>v<span class="irregular-highlight">ie</span>ne</td></tr>
               <tr><td>nosotros</td><td>venimos</td></tr>
               <tr><td>vosotros</td><td>venís</td></tr>
               <tr><td>ellos</td><td>v<span class="irregular-highlight">ie</span>nen</td></tr>
             </table>
           </div>`
  },
  yChangeInfo: {
    title: "Y Change",
    html: `<p>For -er and -ir verbs with a vowel before the ending, the 'i' becomes a 'y' in some forms to avoid three vowels in a row (e.g., 'le-i-ó' → 'leyó').</p>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>leer (pret.)</caption>
               <tr><td>yo</td><td>leí</td></tr>
               <tr><td>tú</td><td>leíste</td></tr>
               <tr><td>él</td><td>le<span class="irregular-highlight">y</span>ó</td></tr>
               <tr><td>nosotros</td><td>leímos</td></tr>
               <tr><td>vosotros</td><td>leísteis</td></tr>
               <tr><td>ellos</td><td>le<span class="irregular-highlight">y</span>eron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>oír (pret.)</caption>
               <tr><td>yo</td><td>oí</td></tr>
               <tr><td>tú</td><td>oíste</td></tr>
               <tr><td>él</td><td>o<span class="irregular-highlight">y</span>ó</td></tr>
               <tr><td>nosotros</td><td>oímos</td></tr>
               <tr><td>vosotros</td><td>oísteis</td></tr>
               <tr><td>ellos</td><td>o<span class="irregular-highlight">y</span>eron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>construir (pres.)</caption>
               <tr><td>yo</td><td>constru<span class="irregular-highlight">y</span>o</td></tr>
               <tr><td>tú</td><td>constru<span class="irregular-highlight">y</span>es</td></tr>
               <tr><td>él</td><td>constru<span class="irregular-highlight">y</span>e</td></tr>
               <tr><td>nosotros</td><td>construimos</td></tr>
               <tr><td>vosotros</td><td>construís</td></tr>
               <tr><td>ellos</td><td>constru<span class="irregular-highlight">y</span>en</td></tr>
             </table>
           </div>`
  },
  irregularRootInfo: {
    title: "Irregular Root (Preterite)",
    html: `<p>In the preterite, a group of verbs uses a completely different stem. They also use a unique set of endings.</p>
           <table class="tense-tooltip-table irregular-tooltip-table">
             <tr><th>Infinitive</th><th>Irregular Stem</th><th>Endings</th></tr>
             <tr><td>estar</td><td>estuv-</td><td rowspan="4">-e, -iste, -o, -imos, -isteis, -eron</td></tr>
             <tr><td>poder</td><td>pud-</td></tr>
             <tr><td>saber</td><td>sup-</td></tr>
             <tr><td>decir</td><td>dij- (*dijeron)</td></tr>
           </table>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>estar (pret.)</caption>
               <tr><td>yo</td><td><span class="irregular-highlight">estuv</span>e</td></tr>
               <tr><td>tú</td><td><span class="irregular-highlight">estuv</span>iste</td></tr>
               <tr><td>él</td><td><span class="irregular-highlight">estuv</span>o</td></tr>
               <tr><td>nosotros</td><td><span class="irregular-highlight">estuv</span>imos</td></tr>
               <tr><td>vosotros</td><td><span class="irregular-highlight">estuv</span>isteis</td></tr>
               <tr><td>ellos</td><td><span class="irregular-highlight">estuv</span>ieron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>hacer (pret.)</caption>
               <tr><td>yo</td><td><span class="irregular-highlight">hic</span>e</td></tr>
               <tr><td>tú</td><td><span class="irregular-highlight">hic</span>iste</td></tr>
               <tr><td>él</td><td><span class="irregular-highlight">hiz</span>o</td></tr>
               <tr><td>nosotros</td><td><span class="irregular-highlight">hic</span>imos</td></tr>
               <tr><td>vosotros</td><td><span class="irregular-highlight">hic</span>isteis</td></tr>
               <tr><td>ellos</td><td><span class="irregular-highlight">hic</span>ieron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>querer (pret.)</caption>
               <tr><td>yo</td><td><span class="irregular-highlight">quis</span>e</td></tr>
               <tr><td>tú</td><td><span class="irregular-highlight">quis</span>iste</td></tr>
               <tr><td>él</td><td><span class="irregular-highlight">quis</span>o</td></tr>
               <tr><td>nosotros</td><td><span class="irregular-highlight">quis</span>imos</td></tr>
               <tr><td>vosotros</td><td><span class="irregular-highlight">quis</span>isteis</td></tr>
               <tr><td>ellos</td><td><span class="irregular-highlight">quis</span>ieron</td></tr>
             </table>
           </div>`
  },
  stemChange3rdInfo: {
    title: "3rd Person Stem Change (Preterite)",
    html: `<p>Only -ir verbs with a stem change in the present tense have this irregularity. The vowel changes only in the <strong>3rd person singular and plural</strong> (él/ella & ellos/ellas).</p>
           <table class="tense-tooltip-table irregular-tooltip-table">
             <tr><th>Change</th><th>Example</th></tr>
             <tr><td>e → i</td><td>pedir → p<span class="irregular-highlight">i</span>dió</td></tr>
             <tr><td>o → u</td><td>dormir → d<span class="irregular-highlight">u</span>rmió</td></tr>
           </table>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>pedir (pret.)</caption>
               <tr><td>yo</td><td>pedí</td></tr>
               <tr><td>tú</td><td>pediste</td></tr>
               <tr><td>él</td><td>p<span class="irregular-highlight">i</span>dió</td></tr>
               <tr><td>nosotros</td><td>pedimos</td></tr>
               <tr><td>vosotros</td><td>pedisteis</td></tr>
               <tr><td>ellos</td><td>p<span class="irregular-highlight">i</span>dieron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>dormir (pret.)</caption>
               <tr><td>yo</td><td>dormí</td></tr>
               <tr><td>tú</td><td>dormiste</td></tr>
               <tr><td>él</td><td>d<span class="irregular-highlight">u</span>rmió</td></tr>
               <tr><td>nosotros</td><td>dormimos</td></tr>
               <tr><td>vosotros</td><td>dormisteis</td></tr>
               <tr><td>ellos</td><td>d<span class="irregular-highlight">u</span>rmieron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>morir (pret.)</caption>
               <tr><td>yo</td><td>morí</td></tr>
               <tr><td>tú</td><td>moriste</td></tr>
               <tr><td>él</td><td>m<span class="irregular-highlight">u</span>rió</td></tr>
               <tr><td>nosotros</td><td>morimos</td></tr>
               <tr><td>vosotros</td><td>moristeis</td></tr>
               <tr><td>ellos</td><td>m<span class="irregular-highlight">u</span>rieron</td></tr>
             </table>
           </div>`
  },
  totallyIrregularInfo: {
    title: "Totally Irregular (Preterite)",
    html: `<p>The verbs <strong>ser</strong> (to be) and <strong>ir</strong> (to go) are identical in the preterite and completely irregular. You must use context to tell them apart.</p>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>ser / ir (pret.)</caption>
               <tr><td>yo</td><td class="irregular-highlight">fui</td></tr>
               <tr><td>tú</td><td class="irregular-highlight">fuiste</td></tr>
               <tr><td>él</td><td class="irregular-highlight">fue</td></tr>
               <tr><td>nosotros</td><td class="irregular-highlight">fuimos</td></tr>
               <tr><td>vosotros</td><td class="irregular-highlight">fuisteis</td></tr>
               <tr><td>ellos</td><td class="irregular-highlight">fueron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>dar (pret.)</caption>
               <tr><td>yo</td><td class="irregular-highlight">di</td></tr>
               <tr><td>tú</td><td class="irregular-highlight">diste</td></tr>
               <tr><td>él</td><td class="irregular-highlight">dio</td></tr>
               <tr><td>nosotros</td><td class="irregular-highlight">dimos</td></tr>
               <tr><td>vosotros</td><td class="irregular-highlight">disteis</td></tr>
               <tr><td>ellos</td><td class="irregular-highlight">dieron</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>ver (pret.)</caption>
               <tr><td>yo</td><td class="irregular-highlight">vi</td></tr>
               <tr><td>tú</td><td class="irregular-highlight">viste</td></tr>
               <tr><td>él</td><td class="irregular-highlight">vio</td></tr>
               <tr><td>nosotros</td><td class="irregular-highlight">vimos</td></tr>
               <tr><td>vosotros</td><td class="irregular-highlight">visteis</td></tr>
               <tr><td>ellos</td><td class="irregular-highlight">vieron</td></tr>
             </table>
           </div>`
  },
  irregularParticipleInfo: {
    title: "Irregular Participle",
    html: `<p>Some verbs have irregular past participles, used with <strong>haber</strong> in perfect tenses (like Present Perfect).</p>
           <table class="tense-tooltip-table irregular-tooltip-table">
             <tr><th>Infinitive</th><th>Irregular Participle</th></tr>
             <tr><td>abrir</td><td>abie<span class="irregular-highlight">rto</span></td></tr>
             <tr><td>escribir</td><td>escri<span class="irregular-highlight">to</span></td></tr>
             <tr><td>hacer</td><td>he<span class="irregular-highlight">cho</span></td></tr>
             <tr><td>ver</td><td>vi<span class="irregular-highlight">sto</span></td></tr>
             <tr><td>poner</td><td>pue<span class="irregular-highlight">sto</span></td></tr>
           </table>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>ver (pres. perf.)</caption>
               <tr><td>yo</td><td>he <span class="irregular-highlight">visto</span></td></tr>
               <tr><td>tú</td><td>has <span class="irregular-highlight">visto</span></td></tr>
               <tr><td>él</td><td>ha <span class="irregular-highlight">visto</span></td></tr>
               <tr><td>nosotros</td><td>hemos <span class="irregular-highlight">visto</span></td></tr>
               <tr><td>vosotros</td><td>habéis <span class="irregular-highlight">visto</span></td></tr>
               <tr><td>ellos</td><td>han <span class="irregular-highlight">visto</span></td></tr>
             </table>
             <table class="conjugation-box">
               <caption>escribir (pres. perf.)</caption>
               <tr><td>yo</td><td>he <span class="irregular-highlight">escrito</span></td></tr>
               <tr><td>tú</td><td>has <span class="irregular-highlight">escrito</span></td></tr>
               <tr><td>él</td><td>ha <span class="irregular-highlight">escrito</span></td></tr>
               <tr><td>nosotros</td><td>hemos <span class="irregular-highlight">escrito</span></td></tr>
               <tr><td>vosotros</td><td>habéis <span class="irregular-highlight">escrito</span></td></tr>
               <tr><td>ellos</td><td>han <span class="irregular-highlight">escrito</span></td></tr>
             </table>
             <table class="conjugation-box">
               <caption>poner (pres. perf.)</caption>
               <tr><td>yo</td><td>he <span class="irregular-highlight">puesto</span></td></tr>
               <tr><td>tú</td><td>has <span class="irregular-highlight">puesto</span></td></tr>
               <tr><td>él</td><td>ha <span class="irregular-highlight">puesto</span></td></tr>
               <tr><td>nosotros</td><td>hemos <span class="irregular-highlight">puesto</span></td></tr>
               <tr><td>vosotros</td><td>habéis <span class="irregular-highlight">puesto</span></td></tr>
               <tr><td>ellos</td><td>han <span class="irregular-highlight">puesto</span></td></tr>
             </table>
           </div>`
  },
  irregularFutureInfo: {
    title: "Irregular Future/Conditional",
    html: `<p>These verbs use an irregular stem for both the <strong>Future</strong> and <strong>Conditional</strong> tenses. The endings are still regular.</p>
           <table class="tense-tooltip-table irregular-tooltip-table">
             <tr><th>Infinitive</th><th>Irregular Stem</th></tr>
             <tr><td>decir</td><td><span class="irregular-highlight">dir</span>-</td></tr>
             <tr><td>hacer</td><td><span class="irregular-highlight">har</span>-</td></tr>
             <tr><td>poder</td><td><span class="irregular-highlight">podr</span>-</td></tr>
             <tr><td>poner</td><td><span class="irregular-highlight">pondr</span>-</td></tr>
             <tr><td>saber</td><td><span class="irregular-highlight">sabr</span>-</td></tr>
             <tr><td>tener</td><td><span class="irregular-highlight">tendr</span>-</td></tr>
           </table>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>tener (fut.)</caption>
               <tr><td>yo</td><td>ten<span class="irregular-highlight">dr</span>é</td></tr>
               <tr><td>tú</td><td>ten<span class="irregular-highlight">dr</span>ás</td></tr>
               <tr><td>él</td><td>ten<span class="irregular-highlight">dr</span>á</td></tr>
               <tr><td>nosotros</td><td>ten<span class="irregular-highlight">dr</span>emos</td></tr>
               <tr><td>vosotros</td><td>ten<span class="irregular-highlight">dr</span>éis</td></tr>
               <tr><td>ellos</td><td>ten<span class="irregular-highlight">dr</span>án</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>salir (fut.)</caption>
               <tr><td>yo</td><td>sal<span class="irregular-highlight">dr</span>é</td></tr>
               <tr><td>tú</td><td>sal<span class="irregular-highlight">dr</span>ás</td></tr>
               <tr><td>él</td><td>sal<span class="irregular-highlight">dr</span>á</td></tr>
               <tr><td>nosotros</td><td>sal<span class="irregular-highlight">dr</span>emos</td></tr>
               <tr><td>vosotros</td><td>sal<span class="irregular-highlight">dr</span>éis</td></tr>
               <tr><td>ellos</td><td>sal<span class="irregular-highlight">dr</span>án</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>decir (fut.)</caption>
               <tr><td>yo</td><td>d<span class="irregular-highlight">ir</span>é</td></tr>
               <tr><td>tú</td><td>d<span class="irregular-highlight">ir</span>ás</td></tr>
               <tr><td>él</td><td>d<span class="irregular-highlight">ir</span>á</td></tr>
               <tr><td>nosotros</td><td>d<span class="irregular-highlight">ir</span>emos</td></tr>
               <tr><td>vosotros</td><td>d<span class="irregular-highlight">ir</span>éis</td></tr>
               <tr><td>ellos</td><td>d<span class="irregular-highlight">ir</span>án</td></tr>
             </table>
           </div>`
  },
  irregularImperativeInfo: {
    title: "Irregular Affirmative Imperative",
    html: `<p>Some of the most common verbs have irregular commands, especially in the <strong>tú</strong> form.</p>
           <strong class="modal-subtitle">The 8 Core Irregular "Tú" Commands:</strong>
           <p class="irregular-highlight" style="text-align: center; font-size: 1.1em;">
             Ven Di Sal Haz Ten Ve Pon Sé
           </p>
           <p style="text-align: center;">(venir, decir, salir, hacer, tener, ir, poner, ser)</p>
           <strong class="modal-subtitle">Other Irregular Forms:</strong>
           <ul>
             <li><strong>Usted / Ustedes / Nosotros:</strong> These forms are irregular if their <strong>present subjunctive</strong> is irregular.</li>
             <li><em>Examples:</em>
               <ul>
                 <li><strong>hacer:</strong> haga, hagan, hagamos</li>
                 <li><strong>tener:</strong> tenga, tengan, tengamos</li>
                 <li><strong>ir:</strong> vaya, vayan, vamos</li>
               </ul>
             </li>
           </ul>
           <p>Remember, the <strong>vosotros</strong> command is almost never irregular (just *id* for "ir").</p>`
  },
  irregularNegativeImperativeInfo: {
    title: "Irregular Negative Imperative",
    html: `<p>Negative commands use the <strong>present subjunctive</strong>, so any irregularity in the subjunctive will appear here.</p>
           <strong class="modal-subtitle">Key Irregular Verbs to Know:</strong>
           <table class="tense-tooltip-table">
             <tr><th>Infinitive</th><th>Tú Command</th><th>Usted Command</th></tr>
             <tr><td>ir (to go)</td><td>no vayas</td><td>no vaya</td></tr>
             <tr><td>ser (to be)</td><td>no seas</td><td>no sea</td></tr>
             <tr><td>dar (to give)</td><td>no des</td><td>no dé</td></tr>
             <tr><td>estar (to be)</td><td>no estés</td><td>no esté</td></tr>
             <tr><td>saber (to know)</td><td>no sepas</td><td>no sepa</td></tr>
           </table>
           <strong class="modal-subtitle">Remember the Pattern:</strong>
           <p>If the 'yo' form in the present tense is irregular (e.g., <em>tengo, pongo, conozco</em>), that irregularity carries over to most negative commands.</p>
           <ul>
               <li>tener → yo tengo → <em>no tengas, no tenga...</em></li>
               <li>conocer → yo conozco → <em>no conozcas, no conozca...</em></li>
           </ul>`
  },
  irregularImperfectInfo: {
    title: "Irregular Imperfect",
    html: `<p>There are only <strong>three</strong> verbs with irregular forms in the Imperfect tense. All others are regular.</p>
           <div class="conjugation-boxes">
             <table class="conjugation-box">
               <caption>ir (impf.)</caption>
               <tr><td>yo</td><td class="irregular-highlight">iba</td></tr>
               <tr><td>tú</td><td class="irregular-highlight">ibas</td></tr>
               <tr><td>él</td><td class="irregular-highlight">iba</td></tr>
               <tr><td>nosotros</td><td class="irregular-highlight">íbamos</td></tr>
               <tr><td>vosotros</td><td class="irregular-highlight">ibais</td></tr>
               <tr><td>ellos</td><td class="irregular-highlight">iban</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>ser (impf.)</caption>
               <tr><td>yo</td><td class="irregular-highlight">era</td></tr>
               <tr><td>tú</td><td class="irregular-highlight">eras</td></tr>
               <tr><td>él</td><td class="irregular-highlight">era</td></tr>
               <tr><td>nosotros</td><td class="irregular-highlight">éramos</td></tr>
               <tr><td>vosotros</td><td class="irregular-highlight">erais</td></tr>
               <tr><td>ellos</td><td class="irregular-highlight">eran</td></tr>
             </table>
             <table class="conjugation-box">
               <caption>ver (impf.)</caption>
               <tr><td>yo</td><td class="irregular-highlight">veía</td></tr>
               <tr><td>tú</td><td class="irregular-highlight">veías</td></tr>
               <tr><td>él</td><td class="irregular-highlight">veía</td></tr>
               <tr><td>nosotros</td><td class="irregular-highlight">veíamos</td></tr>
               <tr><td>vosotros</td><td class="irregular-highlight">veíais</td></tr>
               <tr><td>ellos</td><td class="irregular-highlight">veían</td></tr>
             </table>
           </div>`
  },
  reflexiveInfo: {
    title: "Reflexive Verbs",
    html: `<p>The subject performs and receives the action. They use reflexive pronouns (me, te, se, nos, os, se) placed <strong>before</strong> the conjugated verb.</p>
           <strong class="modal-subtitle">Example: Lavarse (to wash oneself)</strong>
           <p><em>"Yo <strong>me lavo</strong> las manos."</em> (I wash my hands.)</p>
           <table class="tense-tooltip-table irregular-tooltip-table">
             <tr><th>Pronoun</th><th>Reflexive Pronoun</th></tr>
             <tr><td>yo</td><td>me</td></tr>
             <tr><td>tú</td><td>te</td></tr>
             <tr><td>él/ella/ud.</td><td>se</td></tr>
             <tr><td>nosotros</td><td>nos</td></tr>
             <tr><td>vosotros</td><td>os</td></tr>
             <tr><td>ellos/ellas/uds.</td><td>se</td></tr>
           </table>
           <p>Notice how the infinitive ends in <strong>-se</strong> (e.g., levantar<strong>se</strong>, duchar<strong>se</strong>, llamar<strong>se</strong>).</p>`
  },
    clueColorsInfo: {
    title: "Clue Color Guide",
    html: `<p>Each pronoun has its own color in the conjugation clues:</p>
           <table class="tense-tooltip-table">
             <tr><th>Pronoun</th><th>Color</th><th>Example</th></tr>
             <tr><td>yo</td><td style="background: #ffbe0b; color: #000; padding: 2px 6px; border-radius: 3px;">Yellow</td><td>hablo</td></tr>
             <tr><td>tú</td><td style="background: #fb5607; color: #fff; padding: 2px 6px; border-radius: 3px;">Orange</td><td>hablas</td></tr>
             <tr><td>vos</td><td style="background: #ff8500; color: #fff; padding: 2px 6px; border-radius: 3px;">Dark Orange</td><td>hablás</td></tr>
             <tr><td>él/ella/usted</td><td style="background: #ff006e; color: #fff; padding: 2px 6px; border-radius: 3px;">Pink</td><td>habla</td></tr>
             <tr><td>nosotros/as</td><td style="background: #8338ec; color: #fff; padding: 2px 6px; border-radius: 3px;">Purple</td><td>hablamos</td></tr>
             <tr><td>vosotros/as</td><td style="background: #3a86ff; color: #fff; padding: 2px 6px; border-radius: 3px;">Blue</td><td>habláis</td></tr>
             <tr><td>ellos/ellas/ustedes</td><td style="background: #fffffc; color: #000; padding: 2px 6px; border-radius: 3px;">White</td><td>hablan</td></tr>
           </table>
           <p>The clues show conjugations in the traditional order, but only for the pronouns you selected for this game.</p>`
  },
};

const bossTooltips = {
  verbRepairerBossInfo: {
    title: "Digital Corrupted Boss",
    html: `<p><strong>🔧 How to defeat this boss:</strong></p>
           <p>The digital interference has <strong>corrupted conjugated verbs</strong> by replacing random letters with underscores (_).</p>
           <p><strong>Your mission:</strong> Look at the corrupted form and type the <strong>complete, correct conjugation</strong>.</p>
           <p><strong>Example:</strong> If you see "hab_amos" → type "hablamos"</p>
           <p><strong>Strategy:</strong> Use your knowledge of conjugation patterns and context clues from the tense and meaning to fill in the missing letters.</p>
           <p><strong>Boss defeats:</strong> 3 correct repairs</p>`
  },
  
  skynetGlitchBossInfo: {
    title: "Skynet Glitch Boss", 
    html: `<p><strong>🤖 How to defeat this boss:</strong></p>
           <p>Skynet has corrupted both the <strong>infinitive and pronoun</strong> by removing random letters (shown as _).</p>
           <p><strong>Your mission:</strong> Decode both the infinitive and pronoun, then conjugate correctly.</p>
           <p><strong>Example:</strong> "com_r – _ú" → decode as "comer – tú" → type "comes"</p>
           <p><strong>Strategy:</strong> 
           <ul>
             <li>First, figure out the complete infinitive (com_r = comer)</li>
             <li>Then, identify the pronoun (_ú = tú)</li>
             <li>Finally, conjugate using the given tense</li>
           </ul></p>
           <p><strong>Boss defeats:</strong> 2 verbs (Normal mode) or 3 verbs (Hard mode)</p>`
  },
  
  nuclearBombBossInfo: {
    title: "Nuclear Countdown Boss",
    html: `<p><strong>💣 How to defeat this boss:</strong></p>
           <p>A nuclear bomb is counting down! You have <strong>30 seconds</strong> to defuse it by correctly conjugating verbs.</p>
           <p><strong>Your mission:</strong> Conjugate verbs quickly and accurately before time runs out.</p>
           <p><strong>Time pressure:</strong> Unlike normal gameplay, you have a <strong>hard 30-second limit</strong> for the entire boss battle.</p>
           <p><strong>Strategy:</strong> 
           <ul>
             <li>Work quickly but accurately</li>
             <li>Use the clue button if you're stuck (costs time/lives but better than exploding!)</li>
             <li>Focus on verbs you know well to save time</li>
           </ul></p>
           <p><strong>Boss defeats:</strong> 4 correct conjugations within 30 seconds</p>
           <p><strong>⚠️ Warning:</strong> If time runs out, it's instant game over!</p>`
  },
  
  t1000BossInfo: {
    title: "T-1000 Mirror Boss",
    html: `<p><strong>🪞 How to defeat this boss:</strong></p>
           <p>The T-1000 mimics everything in reverse! You must type your conjugations <strong>backwards</strong>.</p>
           <p><strong>Your mission:</strong> Conjugate the verb normally in your head, then type it <strong>backwards</strong>.</p>
           <p><strong>Examples:</strong></p>
           <ul>
             <li>"hablar – yo" (Present) → think "hablo" → type "olbah"</li>
             <li>"conectar – nosotros" (Present) → think "conectamos" → type "somatcenoc"</li>
           </ul>
           <p><strong>Mirror Effect:</strong> As you type, the letters will appear mirrored to simulate the T-1000's reflective surface.</p>
           <p><strong>Hint System:</strong></p>
           <ul>
             <li><em>Clue 1:</em> Shows the normal conjugation (e.g., "conectamos")</li>
             <li><em>Final Clue:</em> Shows the complete transformation: "conectamos → somatcenoc"</li>
           </ul>
           <p><strong>Boss defeats:</strong> 1 verb (Easy), 2 verbs (Normal), 3 verbs (Hard)</p>`
  }
};

Object.assign(specificInfoData, bossTooltips);

if (typeof window !== 'undefined') {
  window.tenseShortDescriptions = tenseShortDescriptions;
  window.specificInfoData = specificInfoData;
}
