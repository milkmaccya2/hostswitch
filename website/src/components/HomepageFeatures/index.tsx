import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import Translate from '@docusaurus/Translate';

type FeatureItem = {
  title: string | ReactNode;
  image: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: <Translate id="feature.easy.title">簡単操作</Translate>,
    image: require('@site/static/img/feature_easy_use.png').default,
    description: (
      <Translate id="feature.easy.description">
        HostSwitchは、コマンドラインから直感的にhostsファイルを操作できるように設計されています。
        矢印キーで選ぶだけの対話モードも搭載しています。
      </Translate>
    ),
  },
  {
    title: <Translate id="feature.backup.title">安全なバックアップ</Translate>,
    image: require('@site/static/img/feature_backup.png').default,
    description: (
      <Translate id="feature.backup.description">
        設定を切り替えるたびに、自動的に現在のhostsファイルのバックアップを作成します。
        万が一の場合でも、いつでも元の状態に戻せます。
      </Translate>
    ),
  },
  {
    title: <Translate id="feature.profiles.title">プロファイル管理</Translate>,
    image: require('@site/static/img/feature_profiles.png').default,
    description: (
      <Translate id="feature.profiles.description">
        「ローカル」「Docker」「本番」など、環境ごとにhosts設定をプロファイルとして保存。
        チームメンバーとの設定共有も簡単です。
      </Translate>
    ),
  },
];

function Feature({title, image, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={image} className={styles.featureSvg} alt={String(title)} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
