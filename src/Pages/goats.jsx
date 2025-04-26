import React from 'react';

const Goats = () => {
  const images = [
    { 
      src: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Carl_Friedrich_Gauss.jpg', 
      alt: 'Gauss', 
      text: 'Carl Friedrich Gauss',
      link: 'https://en.wikipedia.org/wiki/Carl_Friedrich_Gauss'
    },
    { 
      src: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Gordon_Moore_1978_%28cropped%29.png', 
      alt: 'Gordon Moore', 
      text: 'Gordon Moore',
      link: 'https://en.wikipedia.org/wiki/Gordon_Moore'
    },
    { 
      src: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Bolyai_J%C3%A1nos_%28M%C3%A1rkos_Ferenc_festm%C3%A9nye%29.jpg', 
      alt: 'János Bolyai', 
      text: 'János Bolyai',
      link: 'https://en.wikipedia.org/wiki/J%C3%A1nos_Bolyai'
    },
    { 
      src: 'https://pbs.twimg.com/profile_images/424495004/GuidoAvatar_400x400.jpg', 
      alt: 'Guido van Rossum', 
      text: 'Guido van Rossum',
      link: 'https://en.wikipedia.org/wiki/Guido_van_Rossum'
    },
    { 
      src: 'https://i1.sndcdn.com/artworks-000062839602-9u8ys7-t500x500.jpg', 
      alt: 'Lauryn Hill', 
      text: 'Lauryn Hill',
      link: 'https://en.wikipedia.org/wiki/Lauryn_Hill'
    },
    { 
      src: 'https://www.speakersassociates.com/wp-content/uploads/2021/12/steve-wozniak-speaker-e1623812363247.jpg', 
      alt: 'Steve Wozniak', 
      text: 'Berkeley, San Jose, and he\'s an amazing guy',
      link: 'https://en.wikipedia.org/wiki/Steve_Wozniak'
    },
    { 
      src: 'https://t3.gstatic.com/licensed-image?q=tbn:ANd9GcTShzW8ifVbuqTBaTes1FP79AE79HJPtPQiIyrxO30SNLg0PhNviqK_t6k4MpyozSqM', 
      alt: 'Katherine Johnson', 
      text: 'Katherine Johnson',
      link: 'https://en.wikipedia.org/wiki/Katherine_Johnson'
    },
    { 
      src: 'https://static01.nyt.com/images/2023/11/16/arts/14andre-item/14andre-item-mediumSquareAt3X.png', 
      alt: 'Andre 3000', 
      text: 'Andre 3k',
      link: 'https://en.wikipedia.org/wiki/Andr%C3%A9_3000'
    },
    { 
      src: 'https://www.sarniahistoricalsociety.com/wp-content/uploads/2015/06/Chris-Hadfield-Sarnias-Man-in-Space.jpg', 
      alt: 'Chris Hadfield', 
      text: 'My hero as a kid',
      link: 'https://en.wikipedia.org/wiki/Chris_Hadfield'
    },
    { 
      src: 'https://i.guim.co.uk/img/media/6fe2fb19ed1b3539b8e814b604041a8541271e34/0_0_7360_4415/master/7360.jpg?width=1200&quality=85&auto=format&fit=max&s=4d5eb4a7876829b6a610a187ef4d641c', 
      alt: 'Edward Snowden', 
      text: 'Edward Snowden',
      link: 'https://en.wikipedia.org/wiki/Edward_Snowden'
    },
    { 
      src: 'https://media.newyorker.com/photos/64123041652f9d9fe976fff0/1:1/w_1781,h_1781,c_limit/ra1146.jpg', 
      alt: 'Ada Lovelace', 
      text: 'Ada Lovelace',
      link: 'https://en.wikipedia.org/wiki/Ada_Lovelace'
    },
    { 
      src: 'https://preview.redd.it/jaylen-brown-is-an-nba-champion-v0-whhm9nbyx87d1.jpeg?auto=webp&s=10702729b1a641a1b16e17de441cf486d636def7', 
      alt: 'Jaylen Brown', 
      text: 'UC Berkeley Chess Captain, and 2024 NBA Champ',
      link: 'https://en.wikipedia.org/wiki/Jaylen_Brown'
    },
    { 
      src: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Douglas_Engelbart_in_2008.jpg', 
      alt: 'Douglas Engelbart', 
      text: 'Douglas Engelbart',
      link: 'https://en.wikipedia.org/wiki/Douglas_Engelbart'
    },
    { 
      src: 'https://people.com/thmb/zj1h1umGpUCeWDdJbzgw5K1UZSs=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc():focal(979x539:981x541)/dennis-rodman-1-5cd0f61b2ac34f7793682eabc837877e.jpg', 
      alt: 'Dennis Rodman', 
      text: 'Dennis Rodman',
      link: 'https://en.wikipedia.org/wiki/Dennis_Rodman'
    },
    { 
      src: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Alan_Kay_and_the_prototype_of_the_Dynabook_%283009206205%29.jpg', 
      alt: 'Alan Kay', 
      text: 'Alan Kay',
      link: 'https://en.wikipedia.org/wiki/Alan_Kay'
    },
    { 
      src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQb1rlaRxRbnhUuWeSJBGNfG_pYicLl1ej6tA&s', 
      alt: 'Roy Clay Sr.', 
      text: 'Roy Clay Sr.',
      link: 'https://en.wikipedia.org/wiki/Roy_Clay'
    },
    { 
      src: '/IMG_7177.jpeg',
      text: "Colin O'brien",
      alt: 'Gauss',
      link: "https://www.linkedin.com/in/colin-o-brien-bb27a1214/"
    },

  ];

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-8xl mx-auto px-6">
        <h2 className="text-4xl font-serif text-center pb-8">my favorite people</h2>
        
        <div className="flex flex-wrap justify-center">
          {images.map((image, index) => (
            <a 
              key={index}
              href={image.link}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-48 h-48 overflow-hidden group"
            >
              <img 
                src={image.src} 
                alt={image.alt} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="text-white text-center p-3 font-serif">
                  {image.text}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Goats;