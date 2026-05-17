// scripture.js — Verse of the Day library for My Diary PWA

const VERSE_LIBRARY = {
  dashboard: [
    { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" },
    { text: "The steadfast love of the Lord never ceases; his mercies never come to an end.", ref: "Lamentations 3:22-23" },
    { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
    { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
    { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" },
    { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.", ref: "Joshua 1:9" },
    { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
    { text: "The Lord bless you and keep you; the Lord make his face shine on you.", ref: "Numbers 6:24-25" },
    { text: "Delight yourself in the Lord, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
    { text: "Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.", ref: "Philippians 4:6" },
    { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" },
    { text: "Give thanks to the Lord, for he is good; his love endures forever.", ref: "Psalm 107:1" },
  ],
  habits: [
    { text: "Do you not know that your bodies are temples of the Holy Spirit? Honor God with your bodies.", ref: "1 Corinthians 6:19-20" },
    { text: "Physical training is of some value, but godliness has value for all things.", ref: "1 Timothy 4:8" },
    { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest.", ref: "Galatians 6:9" },
    { text: "So whether you eat or drink or whatever you do, do it all for the glory of God.", ref: "1 Corinthians 10:31" },
    { text: "Train yourself to be godly.", ref: "1 Timothy 4:7" },
    { text: "Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life.", ref: "James 1:12" },
    { text: "Run in such a way as to get the prize.", ref: "1 Corinthians 9:24" },
    { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
    { text: "Therefore, I urge you, brothers and sisters, to offer your bodies as a living sacrifice, holy and pleasing to God.", ref: "Romans 12:1" },
    { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
  ],
  journal: [
    { text: "Search me, God, and know my heart; test me and know my anxious thoughts.", ref: "Psalm 139:23" },
    { text: "Pour out your heart before him; God is a refuge for us.", ref: "Psalm 62:8" },
    { text: "Write the vision; make it plain on tablets, so he may run who reads it.", ref: "Habakkuk 2:2" },
    { text: "Let the morning bring me word of your unfailing love, for I have put my trust in you.", ref: "Psalm 143:8" },
    { text: "When I am afraid, I put my trust in you.", ref: "Psalm 56:3" },
    { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
    { text: "He heals the brokenhearted and binds up their wounds.", ref: "Psalm 147:3" },
    { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" },
    { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
    { text: "You keep track of all my sorrows. You have collected all my tears in your bottle.", ref: "Psalm 56:8" },
  ],
  goals: [
    { text: "He who began a good work in you will carry it on to completion until the day of Christ Jesus.", ref: "Philippians 1:6" },
    { text: "Commit to the Lord whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
    { text: "With God all things are possible.", ref: "Matthew 19:26" },
    { text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.", ref: "Philippians 3:14" },
    { text: "Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us.", ref: "Ephesians 3:20" },
    { text: "Being confident of this, that he who began a good work in you will carry it on to completion.", ref: "Philippians 1:6" },
    { text: "The plans of the diligent lead to profit as surely as haste leads to poverty.", ref: "Proverbs 21:5" },
    { text: "Many are the plans in a person's heart, but it is the Lord's purpose that prevails.", ref: "Proverbs 19:21" },
    { text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.", ref: "Matthew 7:7" },
    { text: "No eye has seen, no ear has heard, no mind has conceived what God has prepared for those who love him.", ref: "1 Corinthians 2:9" },
  ],
  spending: [
    { text: "The plans of the diligent lead to profit as surely as haste leads to poverty.", ref: "Proverbs 21:5" },
    { text: "Whoever can be trusted with very little can also be trusted with much.", ref: "Luke 16:10" },
    { text: "Honor the Lord with your wealth, with the firstfruits of all your crops.", ref: "Proverbs 3:9" },
    { text: "A good person leaves an inheritance for their children's children.", ref: "Proverbs 13:22" },
    { text: "Keep your lives free from the love of money and be content with what you have.", ref: "Hebrews 13:5" },
    { text: "Bring the whole tithe into the storehouse... and see if I will not throw open the floodgates of heaven.", ref: "Malachi 3:10" },
    { text: "The rich rule over the poor, and the borrower is slave to the lender.", ref: "Proverbs 22:7" },
    { text: "Wealth gained hastily will dwindle, but whoever gathers little by little will increase it.", ref: "Proverbs 13:11" },
    { text: "Godliness with contentment is great gain.", ref: "1 Timothy 6:6" },
    { text: "Give, and it will be given to you. A good measure, pressed down, shaken together and running over.", ref: "Luke 6:38" },
  ],
  work: [
    { text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", ref: "Colossians 3:23" },
    { text: "Do not merely listen to the word, and so deceive yourselves. Do what it says.", ref: "James 1:22" },
    { text: "Diligent hands will rule, but laziness ends in forced labor.", ref: "Proverbs 12:24" },
    { text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you.", ref: "Zephaniah 3:17" },
    { text: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.", ref: "Matthew 5:16" },
    { text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" },
    { text: "Commit your work to the Lord, and your plans will be established.", ref: "Proverbs 16:3" },
    { text: "In all toil there is profit, but mere talk tends only to poverty.", ref: "Proverbs 14:23" },
    { text: "The hand of the diligent makes rich.", ref: "Proverbs 10:4" },
    { text: "Never be lacking in zeal, but keep your spiritual fervor, serving the Lord.", ref: "Romans 12:11" },
  ],
};

// Fallback verse shown if category not found
const FALLBACK = { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" };

/**
 * Returns a verse for the given category, rotating daily so it changes each day.
 * Category options: 'dashboard', 'habits', 'journal', 'goals', 'spending', 'work'
 * Falls back to 'dashboard' verses if category not found.
 */
export function getVerseFromLibrary(category = 'dashboard') {
  try {
    const pool = VERSE_LIBRARY[category] || VERSE_LIBRARY['dashboard'];
    // Use day-of-year so verse changes daily but is consistent within the day
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const index = dayOfYear % pool.length;
    return pool[index];
  } catch (e) {
    return FALLBACK;
  }
}

/**
 * Async wrapper — kept for compatibility, just calls getVerseFromLibrary.
 */
export async function getVerse(category = 'dashboard', useAI = false) {
  return getVerseFromLibrary(category);
}
