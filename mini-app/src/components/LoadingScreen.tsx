import styles from './LoadingScreen.module.css'

export function LoadingScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.logo}>🤠</div>
      <h1 className={styles.title}>Academic Saloon</h1>
      <div className={styles.loader}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
    </div>
  )
}
