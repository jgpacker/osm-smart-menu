To easily generate a PNG file from a SVG, install Inkscape and run (changing the resolution as needed):

    export RESOLUTION=96; inkscape -z -w "$RESOLUTION" -h "$RESOLUTION" osm.svg -e "osm${RESOLUTION}x${RESOLUTION}.png"