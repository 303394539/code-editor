import { isString } from 'lodash-es';

import type { PropsWithChildren } from 'react';
import { createContext, useEffect, useMemo } from 'react';

import type { EditorProps } from '../editor';

export type ProviderValue = Pick<
  EditorProps,
  | 'monacoEditorOptions'
  | 'theme'
  | 'onWillMount'
  | 'onDidMount'
  | 'onWillUnmount'
  | 'fontFaces'
  | 'fonts'
>;

export type ProviderProps = PropsWithChildren<ProviderValue> & {
  autoPreloadFonts?: boolean;
};

export type FontOptions = {
  family: string;
  source: string | BufferSource;
  descriptors?: FontFaceDescriptors;
};

export const context = createContext<ProviderValue>({});

const { Provider } = context;

/**
 * @description 加载字体
 */
export const preloadFonts = async (fonts?: FontOptions[]) => {
  const loadedFontFamilySet: Set<string> = new Set<string>();
  const refreshLoadedFamilySet = async () => {
    const fontFaceSet = await document.fonts.ready;
    if (!!fontFaceSet && !!fontFaceSet.size) {
      fontFaceSet.forEach((font) => {
        if (!!font.family && !loadedFontFamilySet.has(font.family)) {
          loadedFontFamilySet.add(font.family);
        }
      });
    }
  };
  await Promise.all(
    fonts
      ?.filter((font) => !loadedFontFamilySet.has(font.family))
      .map(
        ({ family, source, descriptors }) =>
          new Promise<void>((resolve) => {
            const font = new FontFace(
              family,
              isString(source) && !/^url\((.*)\)$/.test(source)
                ? `url(${source})`
                : source,
              descriptors,
            );
            font
              .load()
              .then((ff) => {
                document.fonts.add(ff);
                resolve();
              })
              .catch(resolve);
          }),
      ) || [],
  );
  await refreshLoadedFamilySet();
  return loadedFontFamilySet;
};

const Component = ({
  children,
  fontFaces,
  fonts,
  autoPreloadFonts = true,
  ...moreProps
}: ProviderProps) => {
  const fontsMemo = useMemo(() => fonts || fontFaces, [fonts, fontFaces]);
  const valueMemo = useMemo(
    () => ({
      ...moreProps,
      fonts: fontsMemo,
    }),
    [moreProps, fontsMemo],
  );
  useEffect(() => {
    if (autoPreloadFonts && fontsMemo?.length) {
      preloadFonts(fontsMemo);
    }
  }, [autoPreloadFonts, fontsMemo]);
  return <Provider value={valueMemo}>{children}</Provider>;
};

Component.displayName = 'EditorProvider';

Component.context = context;

export default Component;
