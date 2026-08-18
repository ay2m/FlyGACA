/** ICAO/NATO spelling alphabet + digits with International Morse code.
 *  Language-neutral reference data. */
export interface PhoneticEntry {
  symbol: string;
  word: string;
  morse: string;
}

export const PHONETIC: PhoneticEntry[] = [
  { symbol: 'A', word: 'Alfa', morse: '.-' },
  { symbol: 'B', word: 'Bravo', morse: '-...' },
  { symbol: 'C', word: 'Charlie', morse: '-.-.' },
  { symbol: 'D', word: 'Delta', morse: '-..' },
  { symbol: 'E', word: 'Echo', morse: '.' },
  { symbol: 'F', word: 'Foxtrot', morse: '..-.' },
  { symbol: 'G', word: 'Golf', morse: '--.' },
  { symbol: 'H', word: 'Hotel', morse: '....' },
  { symbol: 'I', word: 'India', morse: '..' },
  { symbol: 'J', word: 'Juliett', morse: '.---' },
  { symbol: 'K', word: 'Kilo', morse: '-.-' },
  { symbol: 'L', word: 'Lima', morse: '.-..' },
  { symbol: 'M', word: 'Mike', morse: '--' },
  { symbol: 'N', word: 'November', morse: '-.' },
  { symbol: 'O', word: 'Oscar', morse: '---' },
  { symbol: 'P', word: 'Papa', morse: '.--.' },
  { symbol: 'Q', word: 'Quebec', morse: '--.-' },
  { symbol: 'R', word: 'Romeo', morse: '.-.' },
  { symbol: 'S', word: 'Sierra', morse: '...' },
  { symbol: 'T', word: 'Tango', morse: '-' },
  { symbol: 'U', word: 'Uniform', morse: '..-' },
  { symbol: 'V', word: 'Victor', morse: '...-' },
  { symbol: 'W', word: 'Whiskey', morse: '.--' },
  { symbol: 'X', word: 'X-ray', morse: '-..-' },
  { symbol: 'Y', word: 'Yankee', morse: '-.--' },
  { symbol: 'Z', word: 'Zulu', morse: '--..' },
  { symbol: '0', word: 'Zero', morse: '-----' },
  { symbol: '1', word: 'One', morse: '.----' },
  { symbol: '2', word: 'Two', morse: '..---' },
  { symbol: '3', word: 'Three', morse: '...--' },
  { symbol: '4', word: 'Four', morse: '....-' },
  { symbol: '5', word: 'Five', morse: '.....' },
  { symbol: '6', word: 'Six', morse: '-....' },
  { symbol: '7', word: 'Seven', morse: '--...' },
  { symbol: '8', word: 'Eight', morse: '---..' },
  { symbol: '9', word: 'Nine', morse: '----.' },
];
