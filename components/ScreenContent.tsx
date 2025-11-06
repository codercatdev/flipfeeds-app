import React from 'react';
import { Text, View } from 'react-native';

import { EditScreenInfo } from './EditScreenInfo';
import { getApp } from '@react-native-firebase/app';

type ScreenContentProps = {
  title: string;
  path: string;
  children?: React.ReactNode;
};

export const ScreenContent = ({ title, path, children }: ScreenContentProps) => {
  return (
    <View className={styles.container}>
      <Text className={styles.title}>{title}</Text>
      <View className={styles.separator} />
      <EditScreenInfo path={path} />
      <Text className='flex max-w-sm mx-auto justify-items-center items-center'>
        {/* {JSON.stringify(getApp(), null, 2)} */}
      </Text>
      {children}
    </View>
  );
};

const styles = {
  container: `flex flex-1 px-4 bg-white items-center justify-center`,
  separator: `h-px w-[300px] bg-gray-200 my-7`,
  title: `text-xl font-bold`,
};
