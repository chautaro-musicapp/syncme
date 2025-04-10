export const sampleSongs = [
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    albumArt: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png",
    year: "2020",
    youtubeId: "4NRXx6U8ABQ",
  },
  {
    title: "Bad Guy",
    artist: "Billie Eilish",
    album: "When We All Fall Asleep, Where Do We Go?",
    albumArt: "https://upload.wikimedia.org/wikipedia/en/3/38/When_We_All_Fall_Asleep%2C_Where_Do_We_Go%3F.png",
    year: "2019",
    youtubeId: "DyDfgMOUjCI",
  },
  {
    title: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    album: "Uptown Special",
    albumArt: "https://upload.wikimedia.org/wikipedia/en/7/7b/Mark_Ronson_-_Uptown_Funk_%28feat._Bruno_Mars%29.png",
    year: "2014",
    youtubeId: "OPf0YbXqDm0",
  }
];

export const generateRoomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
