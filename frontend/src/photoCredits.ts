// Photo credits for the car pictures in public/images/cars (all from Wikimedia Commons).
// CC BY-SA 4.0 requires naming the photographer and the licence; the images are shown unchanged apart from
// being resized by Wikimedia. Generated once; edit by hand if a photo is replaced.

export interface PhotoCredit {
  file: string;
  model: string;
  photographer: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const photoCredits: PhotoCredit[] = [
  {
    "file": "toyota-vios.jpg",
    "model": "Toyota Vios",
    "photographer": "EurovisionNim",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Toyota_Vios_(XP150)_sedan_front_view.jpg"
  },
  {
    "file": "honda-city.jpg",
    "model": "Honda City",
    "photographer": "Ethan Llamas",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Honda_City_GN2_FL_1.5_30th_Anniversary_Pearl_Edition_sedan_Platinum_White_Pearl_01.jpg"
  },
  {
    "file": "mitsubishi-mirage-g4.jpg",
    "model": "Mitsubishi Mirage G4",
    "photographer": "Ethan Llamas",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Mitsubishi_Mirage_G4_1.2_GLS_2023.jpg"
  },
  {
    "file": "toyota-fortuner.jpg",
    "model": "Toyota Fortuner",
    "photographer": "Ethan Llamas",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Toyota_Fortuner_LTD_4x2_20221019.jpg"
  },
  {
    "file": "mitsubishi-montero-sport.jpg",
    "model": "Mitsubishi Montero Sport",
    "photographer": "Ethan Llamas",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:2024_Mitsubishi_Montero_Sport_2.4_GLS_4x2_in_Sterling_Silver_Metallic,_front_right,_06-26-2024.jpg"
  },
  {
    "file": "mitsubishi-xpander.jpg",
    "model": "Mitsubishi Xpander",
    "photographer": "Captainmorlypogi1959",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Mitsubishi_Xpander_1.5_GLS_(Expander)_2023_(Cropped).jpg"
  },
  {
    "file": "ford-everest.jpg",
    "model": "Ford Everest",
    "photographer": "Ethan Llamas",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:2017_Ford_Everest_4x2_Trend_20221009.jpg"
  },
  {
    "file": "toyota-hiace-commuter.jpg",
    "model": "Toyota Hiace Commuter",
    "photographer": "Captainmorlypogi1959",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Toyota_Hiace_Commuter_2023.jpg"
  },
  {
    "file": "nissan-urvan-nv350.jpg",
    "model": "Nissan NV350 Urvan",
    "photographer": "Ethan Llamas",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Nissan_NV350_Urvan_2.5_15-Seater_2019.jpg"
  }
];

/** The credit for an image URL like "/images/cars/toyota-vios.jpg", or undefined for other images. */
export const creditFor = (imageUrl: string) => photoCredits.find((c) => imageUrl === `/images/cars/${c.file}`);
