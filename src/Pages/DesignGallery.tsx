import React, { useState } from "react";

const images =  [
  {
    title: "Edward Hopper",
    description: "Edward Hopper",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://uploads6.wikiart.org/images/edward-hopper/nighthawks.jpg",
    index: 0,
  },
  {
    title: "Lucian Freud",
    description: "Lucian Freud",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://cdn.sanity.io/images/z2aip6ei/production/515ee4745f8494a74ae6606d6c21cb259d3cdc63-1550x1035.jpg",
    index: 1,
  },
  {
    title: "George Condo",
    description: "George Condo",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://d7hftxdivxxvm.cloudfront.net/?height=800&quality=50&resize_to=fit&src=https%3A%2F%2Fd32dm0rphc51dk.cloudfront.net%2FK4TgoRqKR_Fw2Kwa770oOQ%2Fnormalized.jpg&width=699",
    index: 2,
  },
  {
    title: "De Chirico",
    description: "De Chirico",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://uploads5.wikiart.org/images/giorgio-de-chirico/mystery-and-melancholy-of-a-street-1914.jpg",
    index: 3,
  },
  {
    title: "Death of Socrates",
    description: "Jacques-Louis David",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://images.metmuseum.org/CRDImages/ep/original/DP-13139-001.jpg",
    index: 4,
  },
  {
    title: "Surrealism",
    description: "René Magritte",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://d7hftxdivxxvm.cloudfront.net/?height=618&quality=80&resize_to=fit&src=https%3A%2F%2Fd32dm0rphc51dk.cloudfront.net%2FKyKZxZ8gYfINnj3QkfedrA%2Flarger.jpg&width=445",
    index: 5,
  },
  {
    title: "Magritte",
    description: "This is not a website.",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://d7hftxdivxxvm.cloudfront.net/?height=545&quality=50&resize_to=fit&src=https%3A%2F%2Fd32dm0rphc51dk.cloudfront.net%2FWcwkioRzhy4FxLqkyJJmkw%2Fmain.jpg&width=800",
    index: 6,
  },
  {
    title: "Van Gogh",
    description: "Van Gogh sunflower fakes",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://upload.wikimedia.org/wikipedia/commons/4/46/Vincent_Willem_van_Gogh_127.jpg",
    index: 7,
  },
  {
    title: "Francis Bacon",
    description: "Francis Bacon",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://sothebys-com.brightspotcdn.com/dims4/default/964f09d/2147483647/strip/true/crop/1459x2000+0+0/resize/684x938!/quality/90/?url=http%3A%2F%2Fsothebys-brightspot.s3.amazonaws.com%2Fdotcom%2F47%2F41%2Fc2c6bd924274ac3ed265c702fdf9%2F959n10069-b5mt5-comp.jpg",
    index: 8,
  },
  {
    title: "Kanye Art",
    description: "Diego Velázquez",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Retrato_del_Papa_Inocencio_X._Roma%2C_by_Diego_Vel%C3%A1zquez.jpg/960px-Retrato_del_Papa_Inocencio_X._Roma%2C_by_Diego_Vel%C3%A1zquez.jpg",
    index: 9,
  },
  {
    title: "Guy Buffet",
    description: "Guy Buffet martini",
    category: "Art",
    subcategory: "Cool pics",
    src: "https://i.redd.it/xkxrfo4cqys41.png",
    index: 10,
  },
  {
    title: "M.C. Escher",
    description: "M.C Escher",
    category: "Goats",
    subcategory: "",
    src: "https://upload.wikimedia.org/wikipedia/en/6/66/Hand_with_Reflecting_Sphere.jpg",
    index: 15,
  }
];

// Original images from the previous component
const originalImages = [
  {
    title: "Favorite designs",
    description: "This is the fourth image in the gallery.",
    src: "https://artsandcraftshomes.com/.image/ar_16:9%2Cc_fill%2Ccs_srgb%2Cfl_progressive%2Cq_auto:good%2Cw_1200/MTc5NDg2NzE3NjU5NTg4NTQ4/oct18_i_segue3_sp05-088bookssu99vertikoff_gn.jpg",
    category: "Design Theories",
    subcategory: "",
    index: 17,
  },
  {
    title: "Favorite designs",
    description: "This is the first image in the gallery.",
    src: "https://www.arcade-museum.com/images-game/18/star-trek--for-play-18810.jpg",
    category: "Design Theories",
    subcategory: "",
    index: 18,
  },
  {
    title: "Favorite designs",
    description: "This is the second image in the gallery.",
    src: "https://archive.computerhistory.org/resources/text/Apple/Apple.II.1977.102637933.fc.lg.jpg",
    category: "Design Theories",
    subcategory: "",
    index: 19,
  },
  {
    title: "Favorite designs",
    description: "This is the third image in the gallery.",
    src: "https://derivativo.library.columbia.edu/iiif/2/ldpd:481526/full/1200,/0/default.jpg",
    category: "Design Theories",
    subcategory: "",
    index: 20,
  },
];
const ImageGalleryComponent = () => {
  const [shownIndex, setIndex] = useState(0);

  const handlePrevious = () => {
    setIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-col items-center justify-center relative">
        <ImageComponent image={images[shownIndex]} />
        
        {/* Navigation buttons positioned within the component */}
        <div className="absolute z-10 left-4 top-1/2 transform -translate-y-1/2">
          <button
            className="font-serif text-2xl bg-white py-3 px-5 rounded-full shadow-md hover:shadow-xl transition-shadow"
            onClick={handlePrevious}
            aria-label="Previous image"
          >
            ←
          </button>
        </div>
        
        <div className="absolute z-10 right-4 top-1/2 transform -translate-y-1/2">
          <button
            className="font-serif text-2xl bg-white py-3 px-5 rounded-full shadow-md hover:shadow-xl transition-shadow"
            onClick={handleNext}
            aria-label="Next image"
          >
            →
          </button>
        </div>
        
        {/* Image counter/indicator */}
        <div className="absolute z-10 bottom-6 left-0 right-0">
          <div className="flex justify-center gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === shownIndex ? "bg-black" : "bg-gray-400"
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ImageComponent = ({ image }) => {
  return (
    <div key={image.index} className="w-full shadow-lg">
      <div className="w-full h-[70vh] bg-white flex justify-center items-center p-4">
        <img
          src={image.src}
          alt={image.title}
          className="max-h-full max-w-full rounded-lg shadow-lg object-contain"
        />
      </div>
      <div className="w-full h-32 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl italic font-serif mt-2">{image.description}</h1>
        </div>
      </div>
    </div>
  );
};

export default ImageGalleryComponent;