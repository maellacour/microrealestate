import { Marker, Map as PigeonMap } from 'pigeon-maps';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Loading from './Loading';
import { LocationIllustration } from './Illustrations';

const nominatimBaseURL = 'https://nominatim.openstreetmap.org';
const MARKER_COLOR = '#2d5c4a'; // Bayle pine

export default function Map({ address }) {
  const [center, setCenter] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getLatLong = async () => {
      setLoading(true);

      if (address) {
        let queryAddress;
        if (typeof address === 'object') {
          queryAddress = `q=${encodeURIComponent(
            [
              address.street1,
              address.street2,
              address.zipCode,
              address.city,
              //`state=${encodeURIComponent(address.state)}`, // state often not recognized
              address.country
            ].join(' ')
          )}`;
        } else {
          queryAddress = `q=${encodeURIComponent(address)}`;
        }

        try {
          const response = await axios.get(
            `${nominatimBaseURL}/search?${queryAddress}&format=json&addressdetails=1`
          );

          if (response.data?.[0]?.lat && response.data?.[0]?.lon) {
            setCenter([
              Number(response.data[0].lat),
              Number(response.data[0].lon)
            ]);
          } else {
            setCenter();
          }
        } catch (error) {
          console.error(error);
        }
      }

      setLoading(false);
    };

    getLatLong();
  }, [address]);

  return (
    <div className={`flex items-center justify-center w-full h-64`}>
      {!loading ? (
        center ? (
          <PigeonMap height={256} center={center} zoom={16}>
            <Marker
              height={35}
              width={35}
              color={MARKER_COLOR}
              anchor={center}
            />
          </PigeonMap>
        ) : (
          <LocationIllustration />
        )
      ) : (
        <Loading fullScreen={false} />
      )}
    </div>
  );
}
